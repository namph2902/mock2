package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	_ "github.com/lib/pq"
)

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Age   int    `json:"age"`
}

var db *sql.DB

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
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

	// Print all users after connecting
	rows, err := db.Query("SELECT id, name, email, age FROM users")
	if err != nil {
		log.Fatal("Failed to query users:", err)
	}
	defer rows.Close()
	fmt.Println("Current users in database:")
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Age); err != nil {
			log.Println("Error scanning user:", err)
			continue
		}
		fmt.Printf("ID: %d, Name: %s, Email: %s, Age: %d\n", u.ID, u.Name, u.Email, u.Age)
	}

	http.HandleFunc("/users", withCORS(userHandler))
	http.HandleFunc("/users/", withCORS(userHandler))
	log.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func userHandler(w http.ResponseWriter, r *http.Request) {
	idStr := ""
	if len(r.URL.Path) > len("/users/") {
		idStr = r.URL.Path[len("/users/"):]
	}

	switch r.Method {
	case http.MethodGet:
		if idStr == "" || idStr == "/" {
			// List all users
			rows, err := db.Query("SELECT id, name, email, age FROM users")
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			defer rows.Close()
			var users []User
			for rows.Next() {
				var u User
				if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Age); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				users = append(users, u)
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
		var u User
		err = db.QueryRow("SELECT id, name, email, age FROM users WHERE id=$1", id).
			Scan(&u.ID, &u.Name, &u.Email, &u.Age)
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
			return
		} else if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(u)
	case http.MethodPost:
		if idStr != "" && idStr != "/" {
			http.Error(w, "POST not allowed on specific user", http.StatusMethodNotAllowed)
			return
		}
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		err := db.QueryRow(
			"INSERT INTO users(name, email, age) VALUES($1, $2, $3) RETURNING id",
			u.Name, u.Email, u.Age,
		).Scan(&u.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(u)
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
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_, err = db.Exec(
			"UPDATE users SET name=$1, email=$2, age=$3 WHERE id=$4",
			u.Name, u.Email, u.Age, id,
		)
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
