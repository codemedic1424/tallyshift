//
//  TallyShiftApp.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/23/25.
//

import SwiftUI

@main
struct TallyShiftApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                if authViewModel.isAuthenticated {
                    DashboardView()
                } else {
                    SignInView2()
                }
            }
            .environmentObject(authViewModel)
        }
    }
}
