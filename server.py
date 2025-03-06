from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

port = 50418  # Using the port from runtime information
server_address = ('0.0.0.0', port)
httpd = HTTPServer(server_address, CORSRequestHandler)
print(f"Server running on port {port}")
httpd.serve_forever()