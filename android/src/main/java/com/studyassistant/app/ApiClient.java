package com.studyassistant.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * Unified API Client for Native Android App
 * Connects directly to the shared AI Study Assistant backend URL.
 */
public class ApiClient {
    private static String baseUrl = "https://ais-dev-p5zczddfsq2kobsnbgwws2-282399089860.asia-east1.run.app";
    private static String authToken = "";
    private static final ExecutorService executor = Executors.newFixedThreadPool(4);
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface ApiCallback {
        void onSuccess(JSONObject response);
        void onError(String errorMessage);
    }

    public static void setBaseUrl(String url) {
        if (url != null && !url.trim().isEmpty()) {
            baseUrl = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        }
    }

    public static void setAuthToken(String token) {
        authToken = token;
    }

    public static String getAuthToken() {
        return authToken;
    }

    public static void post(final String endpoint, final JSONObject jsonBody, final ApiCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(baseUrl + endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                if (authToken != null && !authToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + authToken);
                }
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                if (jsonBody != null) {
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonBody.toString().getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }
                }

                int code = conn.getResponseCode();
                BufferedReader br = new BufferedReader(new InputStreamReader(
                    code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8
                ));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line.trim());
                }

                JSONObject resJson = new JSONObject(response.toString());
                mainHandler.post(() -> {
                    if (code >= 200 && code < 300) {
                        callback.onSuccess(resJson);
                    } else {
                        String err = resJson.optString("error", "HTTP Error " + code);
                        callback.onError(err);
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError("Network Error: " + e.getLocalizedMessage()));
            }
        });
    }

    public static void get(final String endpoint, final ApiCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(baseUrl + endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                if (authToken != null && !authToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + authToken);
                }
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);

                int code = conn.getResponseCode();
                BufferedReader br = new BufferedReader(new InputStreamReader(
                    code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8
                ));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line.trim());
                }

                JSONObject resJson = new JSONObject(response.toString());
                mainHandler.post(() -> {
                    if (code >= 200 && code < 300) {
                        callback.onSuccess(resJson);
                    } else {
                        String err = resJson.optString("error", "HTTP Error " + code);
                        callback.onError(err);
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError("Network Error: " + e.getLocalizedMessage()));
            }
        });
    }
}
