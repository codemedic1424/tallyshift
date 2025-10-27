//
//  SignInScreen2.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/26/25.
//

import SwiftUI

struct SignInView2: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        VStack(spacing: 24) {
            Text("🔐 TallyShift Sign In")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            TextField("Email", text: $authViewModel.email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .padding(.horizontal)

            SecureField("Password", text: $authViewModel.password)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)

            Button("Sign In") {
                authViewModel.signIn()
            }
            .buttonStyle(.borderedProminent)
            
            Spacer()
        }
        .padding()
    }
}

#Preview {
    SignInView2()
}
