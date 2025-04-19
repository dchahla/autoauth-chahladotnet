package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
	"time"
)

func main() {
	// Load JSON array of hosts
	// A string flag.
	useFile := flag.Bool("usefile", false, "set to true if you want to use a file")
	pathtocheck := flag.String("pathtocheck", "list of hosts", "list of hosts")
	flag.Parse()

	var hosts []map[string]string

	if *useFile {
		filePath := *pathtocheck
		fileContent, err := ioutil.ReadFile(filePath)
		if err != nil {
			fmt.Println("Error reading file:", err)
			return
		}

		err = json.Unmarshal(fileContent, &hosts)
		if err != nil {
			fmt.Println("Error parsing JSON from file:", err)
			return
		}
	} else {
		// Use the default hosts JSON
		hostsJSON := `[{"host": "https://google.com"}, {"host": "https://apple.com"}, {"host": "https://www.amazon.com/"}, {"host": "https://yahoo.com"}, {"host": "https://app.plex.tv/desktop/#!/n"}, {"host": "https://www.youtube.com/"}]`

		err := json.Unmarshal([]byte(hostsJSON), &hosts)
		if err != nil {
			fmt.Println("Error parsing default JSON:", err)
			return
		}
	}

	// Prepare a channel to receive timestamps and results
	resultsCh := make(chan map[string]interface{}, len(hosts))

	var wg sync.WaitGroup
	for _, h := range hosts {
		wg.Add(1)
		go func(hostMap map[string]string) {
			defer wg.Done()
			host := hostMap["host"]
			timestamp, err := getCurrentTimestamp(host)
			if err != nil {
				fmt.Printf("Error getting timestamp from %s: %v\n", host, err)
				return
			}
			resultsCh <- map[string]interface{}{
				"host":      host,
				"timestamp": timestamp,
			}
			fmt.Println(host, timestamp)

		}(h)
	}

	// Close the results channel after all goroutines are done
	go func() {
		wg.Wait()
		close(resultsCh)
	}()

	var bestHost string
	var bestTimestamp int64
	timeout := time.After(10 * time.Second)

	// Compare timestamps and find the best connection
	for {
		select {
		case result, ok := <-resultsCh:
			if !ok {
				// All results processed
				fmt.Printf("Best host: %s with loadtime of : %d nanoseconds", bestHost, bestTimestamp)
				return
			}
			timestamp := result["timestamp"].(int64)
			host := result["host"].(string)

			if bestTimestamp == 0 || timestamp < bestTimestamp {
				bestTimestamp = timestamp
				bestHost = host
			}
		case <-timeout:
			fmt.Println("Timeout reached")
			return
		}
	}
}

// func getCurrentTimestamp(host string) (int64, error) {
// 	now := time.Now().UnixNano()
// 	client := http.Client{
// 		Timeout: 2 * time.Second,
// 	}

// // Create a new GET request with the specified URL
// req, err := http.NewRequest("GET", host, nil)
// if err != nil {
// 	fmt.Println("Error creating request:", err)
// 	return time.Now().UnixNano() - now, nil
// }

// // Set custom headers
// req.Header.Set("Cache-Control", "no-cache, no-store")

// // Send the GET request using the client
// resp, err := client.Do(req)
// if err != nil {
// 	fmt.Println("Error sending request:", err)
// 	return time.Now().UnixNano() - now, nil
// }
// defer resp.Body.Close()
// 	if resp.StatusCode != http.StatusOK {
// 		return 0, fmt.Errorf("Non-OK status code: %d", resp.StatusCode)
// 	}

// 	body, err := ioutil.ReadAll(resp.Body)
// 	if err != nil {
// 		return 0, err
// 	}
// 	// if host == "https://www.amazon.com/" {
// 	// 	fmt.Println(string(body))
// 	// }
// 	fmt.Println(host, "content-size: ", len(string(body)), "bytes")

// 	return time.Now().UnixNano() - now, nil
// }

func getCurrentTimestamp(host string) (int64, error) {
    start := time.Now()

    client := http.Client{
        Timeout: 2 * time.Second,
    }

    req, err := http.NewRequest("GET", host, nil)
    if err != nil {
        fmt.Println("Error creating request:", err)
        return time.Since(start).Nanoseconds(), nil
    }

    req.Header.Set("Cache-Control", "no-cache, no-store")

    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error sending request:", err)
        return time.Since(start).Nanoseconds(), nil
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return 0, fmt.Errorf("Non-OK status code: %d", resp.StatusCode)
    }

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return 0, err
    }

    fmt.Println(host, "content-size:", len(body), "bytes")

    // Use time.Since to calculate the elapsed time in nanoseconds
    return time.Since(start).Nanoseconds(), nil
}
