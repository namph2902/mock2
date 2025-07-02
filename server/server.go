package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	_ "github.com/lib/pq"
)

type User map[string]interface{}

var db *sql.DB

var (
	emailPattern = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

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

	// Initialize default tables
	initializeDefaultTables()

	// Register handlers
	http.HandleFunc("/users/", withCORS(userHandler))
	http.HandleFunc("/users", withCORS(userHandler))
	http.HandleFunc("/tables", withCORS(tableHandler))

	log.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// Enhanced user handler to work with any table
func userHandler(w http.ResponseWriter, r *http.Request) {
	// Extract table name from query parameter, default to "users"
	tableName := r.URL.Query().Get("table")
	if tableName == "" {
		tableName = "users"
	}

	// Check if table exists
	tableExists, err := checkTableExists(tableName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !tableExists {
		http.Error(w, "Table not found", http.StatusNotFound)
		return
	}

	idStr := ""
	if len(r.URL.Path) > len("/users/") {
		idStr = r.URL.Path[len("/users/"):]
	}

	switch r.Method {
	case http.MethodGet:
		if idStr == "" || idStr == "/" {
			// List all users from specified table
			users, err := getTableData(tableName)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(users)
			return
		}

		// Get user by id from specified table
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		user, err := getUserFromTable(tableName, id)
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
			return
		} else if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
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

		newUser, err := createUserInTable(tableName, userData)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(newUser)

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

		err = updateUserInTable(tableName, id, userData)
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

		err = deleteUserFromTable(tableName, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Table handler for creating tables dynamically
func tableHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var tableRequest struct {
			Name string `json:"name"`
		}

		if err := json.NewDecoder(r.Body).Decode(&tableRequest); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if tableRequest.Name == "" {
			http.Error(w, "Table name is required", http.StatusBadRequest)
			return
		}

		// Check if table already exists
		exists, err := checkTableExists(tableRequest.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if exists {
			http.Error(w, "Table already exists", http.StatusConflict)
			return
		}

		// Create the table
		err = createTable(tableRequest.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{
			"message": fmt.Sprintf("Table '%s' created successfully", tableRequest.Name),
			"name":    tableRequest.Name,
		})

	case http.MethodGet:
		// Return list of all tables
		tables, err := getAllTables()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(tables)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Get all tables in the database
func getAllTables() ([]string, error) {
	query := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
		ORDER BY table_name`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}

	return tables, nil
}

// Validation functions using regex patterns
func validateUserData(userData User) []string {
	var errors []string

	// Validate email
	if email, exists := userData["email"]; exists {
		if emailStr, ok := email.(string); ok {
			if !emailPattern.MatchString(emailStr) {
				errors = append(errors, "Invalid email format")
			}
		}
	}
	return errors
}

func checkTableExists(tableName string) (bool, error) {
	var exists bool
	query := `
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1 AND table_schema = 'public'
        )`
	err := db.QueryRow(query, tableName).Scan(&exists)
	return exists, err
}

func createTable(tableName string) error {
	// Create table with default structure
	query := fmt.Sprintf(`
        CREATE TABLE %s (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            age INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )`, tableName)

	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create table: %w", err)
	}

	fmt.Printf("Table '%s' created successfully\n", tableName)
	return nil
}

func getTableColumns(tableName string) ([]string, error) {
	query := `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position`

	rows, err := db.Query(query, tableName)
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

func getTableData(tableName string) ([]User, error) {
	columns, err := getTableColumns(tableName)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf("SELECT %s FROM %s ORDER BY id", strings.Join(columns, ", "), tableName)
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
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
			return nil, err
		}

		user := make(User)
		for i, col := range columns {
			if values[i] != nil {
				user[col] = values[i]
			}
		}
		users = append(users, user)
	}
	return users, nil
}

func getUserFromTable(tableName string, id int) (User, error) {
	columns, err := getTableColumns(tableName)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf("SELECT %s FROM %s WHERE id=$1", strings.Join(columns, ", "), tableName)
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	err = db.QueryRow(query, id).Scan(valuePtrs...)
	if err != nil {
		return nil, err
	}

	user := make(User)
	for i, col := range columns {
		if values[i] != nil {
			user[col] = values[i]
		}
	}
	return user, nil
}

func createUserInTable(tableName string, userData User) (User, error) {
	// Validate user data using regex patterns
	if errors := validateUserData(userData); len(errors) > 0 {
		return nil, fmt.Errorf("validation failed: %s", strings.Join(errors, "; "))
	}

	columns, err := getTableColumns(tableName)
	if err != nil {
		return nil, err
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
		return nil, fmt.Errorf("no valid fields provided")
	}

	query := fmt.Sprintf(
		"INSERT INTO %s(%s) VALUES(%s) RETURNING id",
		tableName,
		strings.Join(insertColumns, ", "),
		strings.Join(placeholders, ", "),
	)

	var newID int
	err = db.QueryRow(query, values...).Scan(&newID)
	if err != nil {
		return nil, err
	}

	userData["id"] = newID
	return userData, nil
}

func updateUserInTable(tableName string, id int, userData User) error {
	columns, err := getTableColumns(tableName)
	if err != nil {
		return err
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
		return fmt.Errorf("no valid fields to update")
	}

	// Add id as the last parameter
	values = append(values, id)
	query := fmt.Sprintf(
		"UPDATE %s SET %s WHERE id=$%d",
		tableName,
		strings.Join(setClauses, ", "),
		placeholderIndex,
	)

	_, err = db.Exec(query, values...)
	return err
}

func deleteUserFromTable(tableName string, id int) error {
	query := fmt.Sprintf("DELETE FROM %s WHERE id=$1", tableName)
	_, err := db.Exec(query, id)
	return err
}

func initializeDefaultTables() {
	tables := []string{"users"}

	for _, tableName := range tables {
		exists, err := checkTableExists(tableName)
		if err != nil {
			log.Printf("Error checking if table %s exists: %v", tableName, err)
			continue
		}

		if !exists {
			err := createTable(tableName)
			if err != nil {
				log.Printf("Error creating table %s: %v", tableName, err)
			}
		}
	}
}
