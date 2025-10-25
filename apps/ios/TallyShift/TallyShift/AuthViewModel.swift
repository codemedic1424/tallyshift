import SwiftUI
import Foundation
import Combine

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isSignedIn: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func signIn(username: String, password: String) async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        // Simulate network delay
        try? await Task.sleep(nanoseconds: 800_000_000)

        // Mock logic: accept any non-empty credentials
        if username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "Please enter both username and password."
            isSignedIn = false
            return
        }

        // Success
        isSignedIn = true
    }

    func signOut() {
        isSignedIn = false
    }
}
