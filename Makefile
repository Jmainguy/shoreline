.PHONY: build clean run

BINARY := shoreline

# Build Go binary with embedded web assets
build:
	go build -o $(BINARY) .

# Run the server locally
run: build
	./$(BINARY)

clean:
	rm -f $(BINARY)
