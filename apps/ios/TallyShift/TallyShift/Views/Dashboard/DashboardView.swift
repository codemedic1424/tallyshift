//
//  DashboardView.swift
//  TallyShift
//
//  Created by Christopher Wilshusen on 10/26/25.
//

import SwiftUI

struct DashboardView: View {
    var body: some View {
        List {
            Section("QA Modules") {
                NavigationLink("📊 Analytics", destination: AnalyticsView())
                NavigationLink("🧾 Reports", destination: ReportsView())
                NavigationLink("⚙️ Settings", destination: SettingsView())
            }
        }
        .navigationTitle("Dashboard")
    }
}

#Preview {
    NavigationStack { DashboardView() }
}
 
