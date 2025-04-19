package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		err = conn.WriteMessage(messageType, p)
		if err != nil {
			log.Println(err)
			return
		}
	}
}

func main() {
	serverCert := "./fullchain.pem"
	serverKey := "./private.key"

	server := &http.Server{
		Addr: ":8443",
		TLSConfig: &tls.Config{
			Certificates: make([]tls.Certificate, 1),
		},
	}

	cert, err := tls.LoadX509KeyPair(serverCert, serverKey)
	if err != nil {
		log.Fatal(err)
	}

	server.TLSConfig.Certificates[0] = cert

	http.HandleFunc("/ws", handleConnections)

	fmt.Println("Server running on https://localhost:8443")
	err = server.ListenAndServeTLS("", "")
	if err != nil {
		log.Fatal(err)
	}
}
