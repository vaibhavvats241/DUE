package com.due.friendskhata

import android.app.Application
import com.google.firebase.FirebaseApp

/**
 * DUE — Friends Khata Application entry point.
 * Initializes Firebase SDK components.
 */
class DueApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
