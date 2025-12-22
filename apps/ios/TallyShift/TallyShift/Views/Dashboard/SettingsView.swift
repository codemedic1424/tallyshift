//
//  SettingsView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/26/25.
//

import SwiftUI

struct SettingsView: View {
    var body: some View {
        Form {
            Section("Account") {
                Text("Signed in as: placeholder@example.com")
            }
            Section("App") {
                Toggle("Use Demo Data", isOn: .constant(true))
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview { SettingsView() }
 
