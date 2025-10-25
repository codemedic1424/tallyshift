//
//  SignInScreen.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/24/25.
//

import SwiftUI
import Combine

struct SignInScreen: View {
    @EnvironmentObject private var auth: AuthViewModel
    @State private var username: String = ""
    @State private var password: String = ""
    
    var body: some View {
        ZStack {
            // Background: choose gradient or solid color
            LinearGradient(
                colors: [Color.blue.opacity(0.7), Color.green.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            // For a solid gray background instead, comment the gradient above and uncomment below:
//             Color.gray.ignoresSafeArea()

            VStack(alignment: .center, spacing: 24) {
                Image("AppLogoLight")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 300)
                    .padding(.top, 40)

//                Spacer()

                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Username:")
                        Spacer()
                    }
                    TextField("Enter username", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .padding(12)
                        .background(Color.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 8))

                    HStack {
                        Text("Password:")
                        Spacer()
                    }
                    SecureField("Enter password", text: $password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .padding(12)
                        .background(Color.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 8))
                    
                    HStack {
                        Spacer()
                        Link(destination: URL(string: "https://www.tallyshift.com/login")!) {
                            Text("Forgot Password?")
                                .font(.footnote)
                                .fontWeight(.semibold)
                                .foregroundStyle(.blue)
                                .underline()
                        }
                        
                    }
                    if let message = auth.errorMessage {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding(.horizontal)
                
                HStack{
                    Spacer()
                    Button {
                        Task { await auth.signIn(username: username, password: password) }
                    } label: {
                        if auth.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                                .frame(minWidth: 100)
                        } else {
                            Text("Sign In")
                                .font(.title3)
                                .frame(minWidth: 120)
                        }
                    }
                    .background(.blue, in: .capsule)
                    .foregroundStyle(.white)
                    .disabled(auth.isLoading)
                   Spacer()
                    Button("Sign Up") {
                        /*@START_MENU_TOKEN@*//*@PLACEHOLDER=Action@*/ /*@END_MENU_TOKEN@*/
                    }
                    .font(.title3)
                    .frame(minWidth: 120)
                    .background(.blue, in: .capsule)
                    .foregroundStyle(.white)
                    Spacer()
                }
                Spacer()
            }
        }
        .foregroundStyle(.gray)
    }
}

#Preview {
    SignInScreen()
}

