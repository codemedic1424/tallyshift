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
            if auth.isAuthenticated {
                VStack {
                    Image(systemName: "globe")
                        .imageScale(.large)
                        .foregroundStyle(.tint)
                    Text("Hello, world!")
                    Button("Sign Out") { auth.isAuthenticated = false }
                        .padding(.top)
                }
                .padding()
            } else {
                SignInView2()
            }
        }
        .animation(.default, value: auth.isAuthenticated)
    }
}

#Preview("Signed Out") {
    NavigationStack {
        ContentView()
            .environmentObject({
                let vm = AuthViewModel()
                vm.isAuthenticated = false
                return vm
            }())
    }
}

#Preview("Signed In") {
    NavigationStack {
        ContentView()
            .environmentObject({
                let vm = AuthViewModel()
                vm.isAuthenticated = true
                return vm
            }())
    }
}
