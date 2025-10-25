//
//  ContentView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/23/25.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthViewModel

    var body: some View {
        Group {
            if auth.isSignedIn {
                VStack {
                    Image(systemName: "globe")
                        .imageScale(.large)
                        .foregroundStyle(.tint)
                    Text("Hello, world!")
                    Button("Sign Out") { auth.signOut() }
                        .padding(.top)
                }
                .padding()
            } else {
                SignInScreen()
            }
        }
        .animation(.default, value: auth.isSignedIn)
    }
}

#Preview {
    ContentView()
}
