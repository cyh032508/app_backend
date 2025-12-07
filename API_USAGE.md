# API 使用指南

本文档提供前端（iOS/Android）调用后端 API 的示例代码。

## 📋 目录

- [OCR API (`/api/gemini_ocr`)](#ocr-api-apigemini_ocr)
- [认证 API](#认证-api)
  - [注册 (`/api/auth/register`)](#注册-apiauthregister)
  - [登录 (`/api/auth/login`)](#登录-apiauthlogin)
  - [登出 (`/api/auth/logout`)](#登出-apiauthlogout)
  - [重置密码 (`/api/auth/reset-password`)](#重置密码-apiauthreset-password)
- [历史记录 API (`/api/history`)](#历史记录-api-apihistory)

---

## OCR API (`/api/gemini_ocr`)

### API 信息

- **方法**: `POST`
- **路径**: `/api/gemini_ocr`
- **Content-Type**: `multipart/form-data`
- **请求参数**: 
  - `image` (必需): 图片文件
- **响应格式**: JSON

### 响应结构

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "message": "OCR 辨識完成",
    "result_text": "识别后的文字内容",
    "text": "识别后的文字内容",
    "ocr_text": "识别后的文字内容",
    "success": true,
    "data": {
      "original_ocr": { ... },
      "binary_ocr": { ... },
      "optimized": { ... },
      "total_time": 5.23,
      "load_time": 0.1,
      "binarize_time": 0.2
    }
  }
}
```

### iOS (Swift) 示例

```swift
import Foundation
import UIKit

class OCRService {
    let baseURL = "https://your-api-domain.com" // 替换为你的 API 地址
    
    func performOCR(image: UIImage, completion: @escaping (Result<String, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/gemini_ocr") else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        // 创建 multipart/form-data 请求体
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // 添加图片数据
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            completion(.failure(NSError(domain: "Image conversion failed", code: -1)))
            return
        }
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        // 发送请求
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data received", code: -1)))
                return
            }
            
            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                
                if let success = json?["success"] as? Bool, success == true {
                    if let dataDict = json?["data"] as? [String: Any],
                       let resultText = dataDict["result_text"] as? String {
                        completion(.success(resultText))
                    } else {
                        completion(.failure(NSError(domain: "Invalid response format", code: -1)))
                    }
                } else {
                    let message = json?["message"] as? String ?? "Unknown error"
                    completion(.failure(NSError(domain: message, code: -1)))
                }
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
}

// 使用示例
let ocrService = OCRService()
if let image = UIImage(named: "essay_image") {
    ocrService.performOCR(image: image) { result in
        switch result {
        case .success(let text):
            print("OCR 结果: \(text)")
            // 更新 UI
            DispatchQueue.main.async {
                // 显示识别结果
            }
        case .failure(let error):
            print("OCR 失败: \(error.localizedDescription)")
        }
    }
}
```

### Android (Kotlin) 示例

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import android.graphics.Bitmap
import org.json.JSONObject

class OCRService(private val baseURL: String = "https://your-api-domain.com") {
    private val client = OkHttpClient()
    
    fun performOCR(bitmap: Bitmap, callback: (Result<String>) -> Unit) {
        // 将 Bitmap 保存为临时文件
        val tempFile = File.createTempFile("ocr_image", ".jpg")
        val outputStream = FileOutputStream(tempFile)
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        outputStream.close()
        
        // 创建 multipart/form-data 请求体
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "image",
                "image.jpg",
                tempFile.asRequestBody("image/jpeg".toMediaType())
            )
            .build()
        
        val request = Request.Builder()
            .url("$baseURL/api/gemini_ocr")
            .post(requestBody)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(Result.failure(e))
            }
            
            override fun onResponse(call: Call, response: Response) {
                response.body?.let { body ->
                    try {
                        val jsonString = body.string()
                        val json = JSONObject(jsonString)
                        
                        if (json.getBoolean("success")) {
                            val data = json.getJSONObject("data")
                            val resultText = data.getString("result_text")
                            callback(Result.success(resultText))
                        } else {
                            val message = json.getString("message")
                            callback(Result.failure(Exception(message)))
                        }
                    } catch (e: Exception) {
                        callback(Result.failure(e))
                    } finally {
                        // 删除临时文件
                        tempFile.delete()
                    }
                } ?: callback(Result.failure(Exception("No response body")))
            }
        })
    }
}

// 使用示例
val ocrService = OCRService()
ocrService.performOCR(bitmap) { result ->
    result.onSuccess { text ->
        println("OCR 结果: $text")
        // 更新 UI（需要在主线程）
        runOnUiThread {
            // 显示识别结果
        }
    }.onFailure { error ->
        println("OCR 失败: ${error.message}")
    }
}
```

### Android (Kotlin Coroutines) 示例

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import java.io.File
import java.io.FileOutputStream
import android.graphics.Bitmap
import org.json.JSONObject

class OCRService(private val baseURL: String = "https://your-api-domain.com") {
    private val client = OkHttpClient()
    
    suspend fun performOCR(bitmap: Bitmap): Result<String> = withContext(Dispatchers.IO) {
        try {
            // 将 Bitmap 保存为临时文件
            val tempFile = File.createTempFile("ocr_image", ".jpg")
            val outputStream = FileOutputStream(tempFile)
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
            outputStream.close()
            
            // 创建请求
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                    "image",
                    "image.jpg",
                    tempFile.asRequestBody("image/jpeg".toMediaType())
                )
                .build()
            
            val request = Request.Builder()
                .url("$baseURL/api/gemini_ocr")
                .post(requestBody)
                .build()
            
            val response = client.newCall(request).execute()
            val jsonString = response.body?.string() ?: throw Exception("No response body")
            val json = JSONObject(jsonString)
            
            // 删除临时文件
            tempFile.delete()
            
            if (json.getBoolean("success")) {
                val data = json.getJSONObject("data")
                val resultText = data.getString("result_text")
                Result.success(resultText)
            } else {
                val message = json.getString("message")
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// 使用示例（在 ViewModel 或 Repository 中）
viewModelScope.launch {
    val result = ocrService.performOCR(bitmap)
    result.onSuccess { text ->
        _ocrResult.value = text
    }.onFailure { error ->
        _error.value = error.message
    }
}
```

---

## 认证 API

### 注册 (`/api/auth/register`)

#### iOS (Swift) 示例

```swift
func register(email: String, password: String, username: String? = nil, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
    guard let url = URL(string: "\(baseURL)/api/auth/register") else {
        completion(.failure(NSError(domain: "Invalid URL", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    var body: [String: Any] = [
        "email": email,
        "password": password
    ]
    if let username = username {
        body["username"] = username
    }
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // 处理响应...
    }.resume()
}
```

#### Android (Kotlin) 示例

```kotlin
fun register(email: String, password: String, username: String? = null, callback: (Result<AuthResponse>) -> Unit) {
    val json = JSONObject().apply {
        put("email", email)
        put("password", password)
        username?.let { put("username", it) }
    }
    
    val requestBody = json.toString().toRequestBody("application/json".toMediaType())
    
    val request = Request.Builder()
        .url("$baseURL/api/auth/register")
        .post(requestBody)
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        // 处理响应...
    })
}
```

### 登录 (`/api/auth/login`)

#### iOS (Swift) 示例

```swift
func login(email: String, password: String, completion: @escaping (Result<AuthResponse, Error>) -> Void) {
    guard let url = URL(string: "\(baseURL)/api/auth/login") else {
        completion(.failure(NSError(domain: "Invalid URL", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "email": email,
        "password": password
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        guard let data = data else {
            completion(.failure(error ?? NSError(domain: "No data", code: -1)))
            return
        }
        
        do {
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            if let success = json?["success"] as? Bool, success == true,
               let dataDict = json?["data"] as? [String: Any],
               let token = dataDict["token"] as? String {
                
                // 保存 token
                UserDefaults.standard.set(token, forKey: "auth_token")
                
                let authResponse = AuthResponse(
                    user: dataDict["user"] as? [String: Any] ?? [:],
                    token: token,
                    expiresIn: dataDict["expiresIn"] as? Int ?? 0
                )
                completion(.success(authResponse))
            } else {
                let message = json?["message"] as? String ?? "Login failed"
                completion(.failure(NSError(domain: message, code: -1)))
            }
        } catch {
            completion(.failure(error))
        }
    }.resume()
}
```

#### Android (Kotlin) 示例

```kotlin
fun login(email: String, password: String, callback: (Result<AuthResponse>) -> Unit) {
    val json = JSONObject().apply {
        put("email", email)
        put("password", password)
    }
    
    val requestBody = json.toString().toRequestBody("application/json".toMediaType())
    
    val request = Request.Builder()
        .url("$baseURL/api/auth/login")
        .post(requestBody)
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            response.body?.let { body ->
                try {
                    val json = JSONObject(body.string())
                    if (json.getBoolean("success")) {
                        val data = json.getJSONObject("data")
                        val token = data.getString("token")
                        
                        // 保存 token
                        val sharedPref = context.getSharedPreferences("auth", Context.MODE_PRIVATE)
                        sharedPref.edit().putString("token", token).apply()
                        
                        val authResponse = AuthResponse(
                            user = data.getJSONObject("user"),
                            token = token,
                            expiresIn = data.getInt("expiresIn")
                        )
                        callback(Result.success(authResponse))
                    } else {
                        callback(Result.failure(Exception(json.getString("message"))))
                    }
                } catch (e: Exception) {
                    callback(Result.failure(e))
                }
            }
        }
        
        override fun onFailure(call: Call, e: IOException) {
            callback(Result.failure(e))
        }
    })
}
```

### 登出 (`/api/auth/logout`)

#### iOS (Swift) 示例

```swift
func logout(completion: @escaping (Result<Void, Error>) -> Void) {
    guard let url = URL(string: "\(baseURL)/api/auth/logout"),
          let token = UserDefaults.standard.string(forKey: "auth_token") else {
        completion(.failure(NSError(domain: "No token found", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // 无论服务器响应如何，都删除本地 token
        UserDefaults.standard.removeObject(forKey: "auth_token")
        completion(.success(()))
    }.resume()
}
```

#### Android (Kotlin) 示例

```kotlin
fun logout(callback: (Result<Unit>) -> Unit) {
    val sharedPref = context.getSharedPreferences("auth", Context.MODE_PRIVATE)
    val token = sharedPref.getString("token", null) ?: run {
        callback(Result.failure(Exception("No token found")))
        return
    }
    
    val request = Request.Builder()
        .url("$baseURL/api/auth/logout")
        .post(RequestBody.create(null, ByteArray(0)))
        .addHeader("Authorization", "Bearer $token")
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            // 无论服务器响应如何，都删除本地 token
            sharedPref.edit().remove("token").apply()
            callback(Result.success(Unit))
        }
        
        override fun onFailure(call: Call, e: IOException) {
            // 即使请求失败，也删除本地 token
            sharedPref.edit().remove("token").apply()
            callback(Result.success(Unit))
        }
    })
}
```

### 重置密码 (`/api/auth/reset-password`)

#### iOS (Swift) 示例

```swift
func resetPassword(oldPassword: String, newPassword: String, completion: @escaping (Result<Void, Error>) -> Void) {
    guard let url = URL(string: "\(baseURL)/api/auth/reset-password"),
          let token = UserDefaults.standard.string(forKey: "auth_token") else {
        completion(.failure(NSError(domain: "No token found", code: -1)))
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let body: [String: Any] = [
        "oldPassword": oldPassword,
        "newPassword": newPassword
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }
        
        guard let data = data else {
            completion(.failure(NSError(domain: "No data received", code: -1)))
            return
        }
        
        do {
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            if let success = json?["success"] as? Bool, success == true {
                completion(.success(()))
            } else {
                let message = json?["message"] as? String ?? "Password reset failed"
                completion(.failure(NSError(domain: message, code: -1)))
            }
        } catch {
            completion(.failure(error))
        }
    }.resume()
}
```

#### Android (Kotlin) 示例

```kotlin
fun resetPassword(oldPassword: String, newPassword: String, callback: (Result<Unit>) -> Unit) {
    val sharedPref = context.getSharedPreferences("auth", Context.MODE_PRIVATE)
    val token = sharedPref.getString("token", null) ?: run {
        callback(Result.failure(Exception("No token found")))
        return
    }
    
    val json = JSONObject().apply {
        put("oldPassword", oldPassword)
        put("newPassword", newPassword)
    }
    
    val requestBody = json.toString().toRequestBody("application/json".toMediaType())
    
    val request = Request.Builder()
        .url("$baseURL/api/auth/reset-password")
        .post(requestBody)
        .addHeader("Authorization", "Bearer $token")
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            response.body?.let { body ->
                try {
                    val json = JSONObject(body.string())
                    if (json.getBoolean("success")) {
                        callback(Result.success(Unit))
                    } else {
                        val message = json.getString("message")
                        callback(Result.failure(Exception(message)))
                    }
                } catch (e: Exception) {
                    callback(Result.failure(e))
                }
            } ?: callback(Result.failure(Exception("No response body")))
        }
        
        override fun onFailure(call: Call, e: IOException) {
            callback(Result.failure(e))
        }
    })
}
```

#### Android (Kotlin Coroutines) 示例

```kotlin
suspend fun resetPassword(oldPassword: String, newPassword: String): Result<Unit> = withContext(Dispatchers.IO) {
    try {
        val tokenManager = TokenManager(context)
        val token = tokenManager.getToken() ?: return@withContext Result.failure(Exception("No token found"))
        
        val json = JSONObject().apply {
            put("oldPassword", oldPassword)
            put("newPassword", newPassword)
        }
        
        val requestBody = json.toString().toRequestBody("application/json".toMediaType())
        
        val request = Request.Builder()
            .url("$baseURL/api/auth/reset-password")
            .post(requestBody)
            .addHeader("Authorization", "Bearer $token")
            .build()
        
        val response = client.newCall(request).execute()
        val jsonString = response.body?.string() ?: throw Exception("No response body")
        val json = JSONObject(jsonString)
        
        if (json.getBoolean("success")) {
            Result.success(Unit)
        } else {
            val message = json.getString("message")
            Result.failure(Exception(message))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

---

## 🔐 Token 管理

### iOS - 使用 Keychain 存储 Token（更安全）

```swift
import Security

class TokenManager {
    private let service = "com.yourapp.tokens"
    
    func saveToken(_ token: String) {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "auth_token",
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "auth_token",
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let token = String(data: data, encoding: .utf8) {
            return token
        }
        return nil
    }
    
    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "auth_token"
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

### Android - 使用 EncryptedSharedPreferences 存储 Token（更安全）

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "auth_tokens",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    fun saveToken(token: String) {
        sharedPreferences.edit()
            .putString("auth_token", token)
            .apply()
    }
    
    fun getToken(): String? {
        return sharedPreferences.getString("auth_token", null)
    }
    
    fun deleteToken() {
        sharedPreferences.edit()
            .remove("auth_token")
            .apply()
    }
}
```

---

## 📝 注意事项

1. **Base URL**: 记得替换示例代码中的 `baseURL` 为你的实际 API 地址
2. **错误处理**: 所有示例都包含基本的错误处理，建议根据实际需求增强
3. **Token 存储**: 建议使用更安全的方式存储 token（Keychain/EncryptedSharedPreferences）
4. **网络请求**: iOS 建议使用 `URLSession`，Android 建议使用 `OkHttp` 或 `Retrofit`
5. **异步处理**: 确保在主线程更新 UI

