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

type Record map[string]interface{}

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
	http.HandleFunc("/records/", withCORS(recordHandler))
	http.HandleFunc("/records", withCORS(recordHandler))
	http.HandleFunc("/tables/", withCORS(tableHandler))
	http.HandleFunc("/tables", withCORS(tableHandler))
	http.HandleFunc("/columns/", withCORS(columnHandler))
	http.HandleFunc("/columns", withCORS(columnHandler))

	log.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// Enhanced record handler to work with any table
func recordHandler(w http.ResponseWriter, r *http.Request) {
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
			// List all records from specified table
			records, err := getTableData(tableName)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(records)
			return
		}

		// Get record by id from specified table
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid record ID", http.StatusBadRequest)
			return
		}

		record, err := getRecordFromTable(tableName, id)
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
			return
		} else if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(record)

	case http.MethodPost:
		if idStr != "" && idStr != "/" {
			http.Error(w, "POST not allowed on specific record", http.StatusMethodNotAllowed)
			return
		}

		var recordData Record
		if err := json.NewDecoder(r.Body).Decode(&recordData); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		newRecord, err := createRecordInTable(tableName, recordData)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(newRecord)

	case http.MethodPut:
		if idStr == "" || idStr == "/" {
			http.Error(w, "PUT requires record ID", http.StatusBadRequest)
			return
		}

		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid record ID", http.StatusBadRequest)
			return
		}

		var recordData Record
		if err := json.NewDecoder(r.Body).Decode(&recordData); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		err = updateRecordInTable(tableName, id, recordData)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	case http.MethodDelete:
		if idStr == "" || idStr == "/" {
			http.Error(w, "DELETE requires record ID", http.StatusBadRequest)
			return
		}
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid record ID", http.StatusBadRequest)
			return
		}

		err = deleteRecordFromTable(tableName, id)
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
	// Extract table name from URL path for DELETE operations
	tableName := ""
	if strings.HasPrefix(r.URL.Path, "/tables/") {
		tableName = strings.TrimPrefix(r.URL.Path, "/tables/")
	}

	switch r.Method {
	case http.MethodPost:
		var tableRequest struct {
			Name       string                 `json:"name"`
			Columns    map[string]string      `json:"columns,omitempty"`    // Optional: column_name -> column_type
			SampleData map[string]interface{} `json:"sampleData,omitempty"` // Optional: column_name -> sample_value
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

		// Create the table with optional columns or sample data
		var err2 error
		if len(tableRequest.Columns) > 0 {
			err2 = createTableWithColumns(tableRequest.Name, tableRequest.Columns)
		} else if len(tableRequest.SampleData) > 0 {
			err2 = createDynamicTable(tableRequest.Name, tableRequest.SampleData)
		} else {
			err2 = createTable(tableRequest.Name)
		}

		if err2 != nil {
			http.Error(w, err2.Error(), http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"message": fmt.Sprintf("Table '%s' created successfully", tableRequest.Name),
			"name":    tableRequest.Name,
		}

		if len(tableRequest.Columns) > 0 {
			response["columns"] = len(tableRequest.Columns)
		} else if len(tableRequest.SampleData) > 0 {
			response["columns"] = len(tableRequest.SampleData)
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(response)

	case http.MethodGet:
		tables, err := getAllTables()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(tables)

	case http.MethodDelete:
		if tableName == "" {
			http.Error(w, "Table name is required for DELETE", http.StatusBadRequest)
			return
		}

		// Prevent deletion of the default users table
		if tableName == "users" {
			http.Error(w, "Cannot delete the default 'users' table", http.StatusForbidden)
			return
		}

		// Check if table exists
		exists, err := checkTableExists(tableName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if !exists {
			http.Error(w, "Table not found", http.StatusNotFound)
			return
		}

		// Drop the table
		err = dropTable(tableName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"message": fmt.Sprintf("Table '%s' dropped successfully", tableName),
			"name":    tableName,
		})

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
func validateRecordData(recordData Record) []string {
	var errors []string

	// Validate email
	if email, exists := recordData["email"]; exists {
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
	return createDynamicTable(tableName, nil)
}

// createDynamicTable creates a table with optional predefined columns
func createDynamicTable(tableName string, columns map[string]interface{}) error {
	var columnDefs []string

	// Always add id column first
	columnDefs = append(columnDefs, "id SERIAL PRIMARY KEY")

	// Add predefined columns if provided
	if len(columns) > 0 {
		for colName, sampleValue := range columns {
			if colName == "id" {
				continue
			}

			// Sanitize column name
			safeColName := strings.ToLower(strings.ReplaceAll(colName, " ", "_"))
			safeColName = regexp.MustCompile(`[^a-z0-9_]`).ReplaceAllString(safeColName, "_")

			// Determine column type
			columnType := determineColumnType(safeColName, sampleValue)
			columnDefs = append(columnDefs, fmt.Sprintf("%s %s", safeColName, columnType))
		}
	}

	query := fmt.Sprintf("CREATE TABLE %s (%s)", tableName, strings.Join(columnDefs, ", "))

	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create table: %w", err)
	}

	if len(columns) > 0 {
		fmt.Printf("Table '%s' created successfully with %d predefined columns\n", tableName, len(columns))
	} else {
		fmt.Printf("Table '%s' created successfully with id column only\n", tableName)
	}
	return nil
}

// determineColumnType determines the PostgreSQL column type based on sample value
func determineColumnType(columnName string, sampleValue interface{}) string {
	// Check column name patterns first
	columnLower := strings.ToLower(columnName)

	if strings.Contains(columnLower, "email") || strings.Contains(columnLower, "mail") {
		return "VARCHAR(255)"
	}
	if strings.Contains(columnLower, "phone") || strings.Contains(columnLower, "tel") {
		return "VARCHAR(20)"
	}
	if strings.Contains(columnLower, "url") || strings.Contains(columnLower, "website") {
		return "TEXT"
	}
	if strings.Contains(columnLower, "age") {
		return "INTEGER"
	}
	if strings.Contains(columnLower, "salary") || strings.Contains(columnLower, "price") || strings.Contains(columnLower, "amount") {
		return "DECIMAL(12,2)"
	}

	// Check sample value type
	switch v := sampleValue.(type) {
	case string:
		if emailPattern.MatchString(v) {
			return "VARCHAR(255)"
		} else if len(v) > 255 {
			return "TEXT"
		} else {
			return "VARCHAR(255)"
		}
	case int, int64:
		return "INTEGER"
	case float64:
		return "DECIMAL(10,2)"
	case bool:
		return "BOOLEAN"
	default:
		return "TEXT" // Default fallback
	}
}

// createTableWithColumns creates a table with specified columns
func createTableWithColumns(tableName string, columns map[string]string) error {
	if len(columns) == 0 {
		// If no columns specified, create with default structure
		return createTable(tableName)
	}

	var columnDefs []string

	// Always add id column first
	columnDefs = append(columnDefs, "id SERIAL PRIMARY KEY")

	// Add custom columns
	for colName, colType := range columns {
		if colName == "id" {
			continue
		}

		safeColName := strings.ToLower(strings.ReplaceAll(colName, " ", "_"))
		safeColName = regexp.MustCompile(`[^a-z0-9_]`).ReplaceAllString(safeColName, "_")

		columnDefs = append(columnDefs, fmt.Sprintf("%s %s", safeColName, colType))
	}

	query := fmt.Sprintf("CREATE TABLE %s (%s)", tableName, strings.Join(columnDefs, ", "))

	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create table with columns: %w", err)
	}

	fmt.Printf("Table '%s' created successfully with %d custom columns\n", tableName, len(columns))
	return nil
}

func dropTable(tableName string) error {
	// Prevent dropping the default users table
	if tableName == "users" {
		return fmt.Errorf("cannot drop the default 'users' table")
	}

	query := fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName)
	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to drop table: %w", err)
	}

	fmt.Printf("Table '%s' dropped successfully\n", tableName)
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

// addColumnToTable dynamically adds a new column to an existing table
func addColumnToTable(tableName, columnName string, sampleValue interface{}) error {
	actualColumnName, err := addColumnToTableWithReturn(tableName, columnName, sampleValue)
	if err != nil {
		return err
	}
	log.Printf("Successfully added column '%s' (%s) to table '%s'", actualColumnName, determineColumnType(actualColumnName, sampleValue), tableName)
	return nil
}

// addColumnToTableWithReturn dynamically adds a new column and returns the actual column name created
func addColumnToTableWithReturn(tableName, columnName string, sampleValue interface{}) (string, error) {
	safeColumnName := strings.ToLower(strings.ReplaceAll(columnName, " ", "_"))
	safeColumnName = regexp.MustCompile(`[^a-z0-9_]`).ReplaceAllString(safeColumnName, "_")

	columnType := determineColumnType(safeColumnName, sampleValue)

	query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, safeColumnName, columnType)
	_, err := db.Exec(query)
	if err != nil {
		return "", fmt.Errorf("failed to add column %s to table %s: %w", safeColumnName, tableName, err)
	}

	return safeColumnName, nil
}

func getTableData(tableName string) ([]Record, error) {
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

	var records []Record
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		record := make(Record)
		for i, col := range columns {
			if values[i] != nil {
				record[col] = values[i]
			}
		}
		records = append(records, record)
	}
	return records, nil
}

func getRecordFromTable(tableName string, id int) (Record, error) {
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

	record := make(Record)
	for i, col := range columns {
		if values[i] != nil {
			record[col] = values[i]
		}
	}
	return record, nil
}

func createRecordInTable(tableName string, recordData Record) (Record, error) {
	if errors := validateRecordData(recordData); len(errors) > 0 {
		return nil, fmt.Errorf("validation failed: %s", strings.Join(errors, "; "))
	}

	columns, err := getTableColumns(tableName)
	if err != nil {
		return nil, err
	}

	for col := range recordData {
		if col == "id" {
			continue
		}

		columnExists := false
		for _, existingCol := range columns {
			if existingCol == col {
				columnExists = true
				break
			}
		}

		if !columnExists {
			err = addColumnToTable(tableName, col, recordData[col])
			if err != nil {
				log.Printf("Warning: Failed to add column %s to table %s: %v", col, tableName, err)
				continue
			}
			columns = append(columns, col)
			log.Printf("Added new column '%s' to table '%s'", col, tableName)
		}
	}

	// Filter out id column for insert
	var insertColumns []string
	var values []interface{}
	var placeholders []string
	placeholderIndex := 1

	for _, col := range columns {
		if col == "id" {
			continue
		}
		if value, exists := recordData[col]; exists {
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

	recordData["id"] = newID
	return recordData, nil
}

func updateRecordInTable(tableName string, id int, recordData Record) error {
	columns, err := getTableColumns(tableName)
	if err != nil {
		return err
	}

	var setClauses []string
	var values []interface{}
	placeholderIndex := 1

	for _, col := range columns {
		if col == "id" {
			continue
		}
		if value, exists := recordData[col]; exists {
			setClauses = append(setClauses, fmt.Sprintf("%s=$%d", col, placeholderIndex))
			values = append(values, value)
			placeholderIndex++
		}
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields to update")
	}

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

func deleteRecordFromTable(tableName string, id int) error {
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

func columnHandler(w http.ResponseWriter, r *http.Request) {
	tableName := r.URL.Query().Get("table")
	if tableName == "" {
		http.Error(w, "Table name is required", http.StatusBadRequest)
		return
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

	switch r.Method {
	case http.MethodPost:
		var columnData struct {
			Key          string `json:"key"`
			Label        string `json:"label"`
			Type         string `json:"type"`
			Required     bool   `json:"required"`
			DefaultValue string `json:"defaultValue"`
		}

		if err := json.NewDecoder(r.Body).Decode(&columnData); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		if columnData.Key == "" {
			http.Error(w, "Column key is required", http.StatusBadRequest)
			return
		}

		if columnExists(tableName, columnData.Key) {
			http.Error(w, "Column already exists", http.StatusConflict)
			return
		}

		// Add column to table
		actualColumnName, err := addColumnToTableWithReturn(tableName, columnData.Key, columnData.DefaultValue)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error adding column: %v", err), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":          "Column added successfully",
			"actualColumnName": actualColumnName,
		})

	case http.MethodDelete:
		columnKey := r.URL.Query().Get("column")
		if columnKey == "" {
			http.Error(w, "Column key is required", http.StatusBadRequest)
			return
		}

		if columnKey == "id" {
			http.Error(w, "Cannot delete ID column", http.StatusBadRequest)
			return
		}

		if !columnExists(tableName, columnKey) {
			http.Error(w, "Column not found", http.StatusNotFound)
			return
		}

		query := fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", tableName, columnKey)
		_, err = db.Exec(query)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error removing column: %v", err), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Column removed successfully"})

	case http.MethodGet:
		columns, err := getTableColumns(tableName)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get columns: %v", err), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(columns)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Helper function to check if a column exists in a table
func columnExists(tableName, columnName string) bool {
	query := `
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = $1 AND column_name = $2
	`
	var count int
	err := db.QueryRow(query, tableName, columnName).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}
