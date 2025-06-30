package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "strconv"
    "strings"

    _ "github.com/lib/pq"
)

type User map[string]interface{}

var db *sql.DB

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Server is ready to handle CORS preflight requests"))
			return
		}
		h(w, r)
	}
}

func main() {
	connStr := "host=localhost port=5432 user=namph1 password=1234 dbname=mock2 sslmode=disable"
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	fmt.Println("Connected to database successfully")

	applyColumnConfigurations(db)
	showCurrentUsers()

	http.HandleFunc("/users/", withCORS(userHandler))
	http.HandleFunc("/users", withCORS(userHandler))
	log.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func getUserTableColumns() ([]string, error) {
	query := `
		SELECT column_name
		FROM information_schema.columns
		WHERE table_name = 'users'
		ORDER BY ordinal_position
	`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err 
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var column string
		if err := rows.Scan(&column); err != nil {
			return nil, err
		}
		columns = append(columns, column)
	}
	return columns, nil
}
func showCurrentUsers() {
    columns, err := getUserTableColumns()
    if err != nil {
        log.Printf("Error getting user table columns: %v", err)
        return
    }

    query := fmt.Sprintf("SELECT %s FROM users", strings.Join(columns, ", "))
    rows, err := db.Query(query)
    if err != nil {
        log.Printf("Error querying users: %v", err)
        return
    }
    defer rows.Close()

    fmt.Println("Current users in the database:")
    for rows.Next() {
        values := make([]interface{}, len(columns))
        valuePtrs := make([]interface{}, len(columns))
        for i := range values {
            valuePtrs[i] = &values[i]
        }
        if err := rows.Scan(valuePtrs...); err != nil {
            log.Printf("Error scanning row: %v", err)
            continue
        }

        user := make(User)
        for i, col := range columns {
            if values[i] != nil {
                user[col] = values[i]
            }
        }
        fmt.Printf("User: %+v\n", user)
    }
}

func userHandler(w http.ResponseWriter, r *http.Request) {
    idStr := ""
    if len(r.URL.Path) > len("/users/") {
        idStr = r.URL.Path[len("/users/"):]
    }

    switch r.Method {
    case http.MethodGet:
        if idStr == "" || idStr == "/" {
            // List all users with all columns
            columns, err := getUserTableColumns()
            if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }

            query := fmt.Sprintf("SELECT %s FROM users", strings.Join(columns, ", "))
            rows, err := db.Query(query)
            if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }
            defer rows.Close()

            var users []User
            for rows.Next() {
                values := make([]interface{}, len(columns))
                valuePtrs := make([]interface{}, len(columns))
                for i := range values {
                    valuePtrs[i] = &values[i]
                }

                if err := rows.Scan(valuePtrs...); err != nil {
                    http.Error(w, err.Error(), http.StatusInternalServerError)
                    return
                }

                user := make(User)
                for i, col := range columns {
                    if values[i] != nil {
                        user[col] = values[i]
                    }
                }
                users = append(users, user)
            }
            json.NewEncoder(w).Encode(users)
            return
        }

        // Get user by id
        id, err := strconv.Atoi(idStr)
        if err != nil {
            http.Error(w, "Invalid user ID", http.StatusBadRequest)
            return
        }

        columns, err := getUserTableColumns()
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        query := fmt.Sprintf("SELECT %s FROM users WHERE id=$1", strings.Join(columns, ", "))
        values := make([]interface{}, len(columns))
        valuePtrs := make([]interface{}, len(columns))
        for i := range values {
            valuePtrs[i] = &values[i]
        }

        err = db.QueryRow(query, id).Scan(valuePtrs...)
        if err == sql.ErrNoRows {
            http.NotFound(w, r)
            return
        } else if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        user := make(User)
        for i, col := range columns {
            if values[i] != nil {
                user[col] = values[i]
            }
        }
        json.NewEncoder(w).Encode(user)

    case http.MethodPost:
        if idStr != "" && idStr != "/" {
            http.Error(w, "POST not allowed on specific user", http.StatusMethodNotAllowed)
            return
        }

        var userData User
        if err := json.NewDecoder(r.Body).Decode(&userData); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        // Get all available columns except id (auto-increment)
        columns, err := getUserTableColumns()
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        // Filter out id column for insert
        var insertColumns []string
        var values []interface{}
        var placeholders []string
        placeholderIndex := 1

        for _, col := range columns {
            if col == "id" {
                continue // Skip id column as it's auto-increment
            }
            if value, exists := userData[col]; exists {
                insertColumns = append(insertColumns, col)
                values = append(values, value)
                placeholders = append(placeholders, fmt.Sprintf("$%d", placeholderIndex))
                placeholderIndex++
            }
        }

        if len(insertColumns) == 0 {
            http.Error(w, "No valid fields provided", http.StatusBadRequest)
            return
        }

        query := fmt.Sprintf(
            "INSERT INTO users(%s) VALUES(%s) RETURNING id",
            strings.Join(insertColumns, ", "),
            strings.Join(placeholders, ", "),
        )

        var newID int
        err = db.QueryRow(query, values...).Scan(&newID)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        userData["id"] = newID
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(userData)

    case http.MethodPut:
        if idStr == "" || idStr == "/" {
            http.Error(w, "PUT requires user ID", http.StatusBadRequest)
            return
        }
        
        id, err := strconv.Atoi(idStr)
        if err != nil {
            http.Error(w, "Invalid user ID", http.StatusBadRequest)
            return
        }

        var userData User
        if err := json.NewDecoder(r.Body).Decode(&userData); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        // Get all available columns
        columns, err := getUserTableColumns()
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        // Build SET clause dynamically
        var setClauses []string
        var values []interface{}
        placeholderIndex := 1

        for _, col := range columns {
            if col == "id" {
                continue // Skip id column
            }
            if value, exists := userData[col]; exists {
                setClauses = append(setClauses, fmt.Sprintf("%s=$%d", col, placeholderIndex))
                values = append(values, value)
                placeholderIndex++
            }
        }

        if len(setClauses) == 0 {
            http.Error(w, "No valid fields to update", http.StatusBadRequest)
            return
        }

        // Add id as the last parameter
        values = append(values, id)
        query := fmt.Sprintf(
            "UPDATE users SET %s WHERE id=$%d",
            strings.Join(setClauses, ", "),
            placeholderIndex,
        )

        _, err = db.Exec(query, values...)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.WriteHeader(http.StatusNoContent)

    case http.MethodDelete:
        if idStr == "" || idStr == "/" {
            http.Error(w, "DELETE requires user ID", http.StatusBadRequest)
            return
        }
        id, err := strconv.Atoi(idStr)
        if err != nil {
            http.Error(w, "Invalid user ID", http.StatusBadRequest)
            return
        }
        _, err = db.Exec("DELETE FROM users WHERE id=$1", id)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        w.WriteHeader(http.StatusNoContent)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}
type ColumnConfig struct {
	Table    string `json:"table"`
	Column   string `json:"column"`
	Datatype string `json:"datatype"`
}

// Load column configurations from environment or default
func getColumnConfigurations() []ColumnConfig {
	configFile := os.Getenv("COLUMN_CONFIG_FILE")
	if configFile != "" {
		if configs, err := loadConfigFromFile(configFile); err == nil {
			fmt.Printf("Loaded column configurations from file: %s\n", configFile)
			return configs
		}
		log.Printf("Warning: Could not load config from file %s, using defaults", configFile)
	}

	// Return default configurations
	return []ColumnConfig{
		{"users", "phone", "VARCHAR(20)"},
		{"users", "address", "TEXT"},
		{"users", "created_at", "TIMESTAMP DEFAULT NOW()"},
		{"users", "is_active", "BOOLEAN DEFAULT true"},
		{"users", "salary", "DECIMAL(10,2)"},
	}
}

// Load configurations from JSON file
func loadConfigFromFile(filename string) ([]ColumnConfig, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var configs []ColumnConfig
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&configs)
	return configs, err
}

// Apply all column configurations
func applyColumnConfigurations(db *sql.DB) {
	configs := getColumnConfigurations()

	for _, config := range configs {
		err := addColumnIfNotExists(db, config.Table, config.Column, config.Datatype)
		if err != nil {
			log.Printf("Warning: Could not add column %s to %s: %v", config.Column, config.Table, err)
		}
	}
}

// Check if a column exists in a table
func columnExists(db *sql.DB, table, column string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = $1 AND column_name = $2
		)`
	err := db.QueryRow(query, table, column).Scan(&exists)
	return exists, err
}

// Add column only if it doesn't exist
func addColumnIfNotExists(db *sql.DB, table, column, datatype string) error {
	exists, err := columnExists(db, table, column)
	if err != nil {
		return fmt.Errorf("failed to check if column exists: %w", err)
	}

	if exists {
		fmt.Printf("Column '%s' already exists in table '%s'\n", column, table)
		return nil
	}

	return addColumn(db, table, column, datatype)
}

func addColumn(db *sql.DB, table, column, datatype string) error {
	// Add a new column to the specified table
	_, err := db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, datatype))
	if err != nil {
		return fmt.Errorf("failed to add column: %w", err)
	}
	fmt.Printf("Column '%s' added successfully to table '%s'\n", column, table)
	return nil
}
