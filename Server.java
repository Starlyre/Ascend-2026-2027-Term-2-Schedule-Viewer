import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Organization ASCEND - NU Fairview
 * Lightweight Java Web Server for Schedule Availability Checker
 * Powered by standard Java SE (No external dependencies needed)
 */
public class Server {
    private static final int DEFAULT_PORT = 8080;
    private static final Map<String, String> MIME_TYPES = new HashMap<>();

    static {
        MIME_TYPES.put("html", "text/html; charset=UTF-8");
        MIME_TYPES.put("htm", "text/html; charset=UTF-8");
        MIME_TYPES.put("css", "text/css; charset=UTF-8");
        MIME_TYPES.put("js", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("json", "application/json; charset=UTF-8");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("txt", "text/plain; charset=UTF-8");
    }

    public static void main(String[] args) {
        int port = DEFAULT_PORT;
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.out.println("Invalid port specified. Using default: " + DEFAULT_PORT);
            }
        }

        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            server.createContext("/", new StaticFileHandler());
            server.setExecutor(null); // default executor
            server.start();

            String url = "http://localhost:" + port + "/";
            System.out.println("================================================================");
            System.out.println("  ASCEND - NU Fairview Officer Schedule Availability Checker   ");
            System.out.println("  Java Web Server is running successfully!                      ");
            System.out.println("  URL: " + url);
            System.out.println("  Press Ctrl+C in this console to stop the server.              ");
            System.out.println("================================================================");

            // Attempt to open default browser automatically
            try {
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(new URI(url));
                }
            } catch (Exception ignored) {
                // Headless or unsupported environment; user can open URL manually
            }

        } catch (IOException e) {
            System.err.println("Error starting Java server on port " + port + ": " + e.getMessage());
        }
    }

    static class StaticFileHandler implements HttpHandler {
        private final File baseDir = new File(".").getAbsoluteFile();

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            // Decode URL (handles spaces and encoded characters like %20)
            path = URLDecoder.decode(path, "UTF-8");

            // Prevent directory traversal attacks
            if (path.contains("..")) {
                sendResponse(exchange, 403, "Forbidden", "text/plain");
                return;
            }

            File targetFile = new File(baseDir, path.startsWith("/") ? path.substring(1) : path);

            if (!targetFile.exists() || targetFile.isDirectory()) {
                sendResponse(exchange, 404, "404 Not Found: " + path, "text/plain");
                return;
            }

            String ext = "";
            int dotIdx = targetFile.getName().lastIndexOf('.');
            if (dotIdx > 0 && dotIdx < targetFile.getName().length() - 1) {
                ext = targetFile.getName().substring(dotIdx + 1).toLowerCase();
            }

            String contentType = MIME_TYPES.getOrDefault(ext, "application/octet-stream");

            // Allow CORS for easy local access
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Content-Type", contentType);

            long length = targetFile.length();
            exchange.sendResponseHeaders(200, length);

            try (FileInputStream fis = new FileInputStream(targetFile);
                 OutputStream os = exchange.getResponseBody()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) {
                    os.write(buffer, 0, bytesRead);
                }
                os.flush();
            }
        }

        private void sendResponse(HttpExchange exchange, int statusCode, String message, String contentType) throws IOException {
            byte[] bytes = message.getBytes("UTF-8");
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(statusCode, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
                os.flush();
            }
        }
    }
}
