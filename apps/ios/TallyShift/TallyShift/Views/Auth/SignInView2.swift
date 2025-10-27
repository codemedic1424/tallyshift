// ContentView.swift

import SwiftUI

struct SignInView2: View {
    @EnvironmentObject var auth: AuthViewModel
    @FocusState private var focusedField: Field?
    @State private var email: String = ""
    @State private var password: String = ""

    enum Field { case email, password }

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color.blue.opacity(0.75), Color.green.opacity(0.65)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 28) {
                // Centered logo + tagline
                VStack(spacing: 6) {
                    Image("AppLogoLight")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 260)
                    Text("Keep tabs on more than your customers")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.9))
                }
                .padding(.top, 5)

                // Labeled fields with translucent backgrounds
                VStack(alignment: .leading, spacing: 12) {
                    Text("Username:")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal)
                    TextField("Enter username", text: $email)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .submitLabel(.next)
                        .focused($focusedField, equals: .email)
                        .padding(14)
                        .background(.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 12))

                    Text("Password:")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.horizontal)
                    SecureField("Enter password", text: $password)
                        .textContentType(.password)
                        .submitLabel(.go)
                        .focused($focusedField, equals: .password)
                        .padding(14)
                        .background(.white.opacity(0.18), in: RoundedRectangle(cornerRadius: 12))

                   
                    

                // Primary actions: side-by-side
                HStack(spacing: 24) {
                    Button {
                        auth.email = email
                        auth.password = password
                        auth.signIn()
                    } label: {
                        Text("Sign In")
                            .frame(minWidth: 140)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.blue, in: Capsule())
                    .foregroundStyle(.white)
                    .disabled(email.isEmpty || password.isEmpty)

                    Button {
                        // TODO: sign-up flow
                    } label: {
                        Text("Sign Up")
                            .frame(minWidth: 140)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.blue, in: Capsule())
                    .foregroundStyle(.white)
                }
                .padding(.vertical)
                .padding(.horizontal)
                    
                HStack {
                        Spacer()
                        Button {
                            // TODO: route to reset
                        } label: {
                            Text("Forgot Password?")
                                .underline()
                                .font(.footnote.weight(.semibold))
                        }
                        .buttonStyle(.plain)
                        .tint(.blue)
                    }
                .padding(.trailing, 20)
                }
                Spacer(minLength: 40)
            }
            .padding(.bottom)
        }
        .onSubmit {
            switch focusedField {
            case .email:
                focusedField = .password
            default:
                auth.email = email
                auth.password = password
                auth.signIn()
            }
        }
    }
}

#Preview("Sign-In Screen") {
    NavigationStack {
        SignInView2()
            .environmentObject(AuthViewModel())
    }
}
