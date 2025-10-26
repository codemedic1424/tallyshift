import SwiftUI
import Combine

final class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var email = ""
    @Published var password = ""
    
    func signIn() {
        // Placeholder authentication
        if !email.isEmpty && !password.isEmpty {
            isAuthenticated = true
        }
    }
}
