package com.shikara.torrent

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

// Both overrides below satisfy ReactPackage's classic (non-TurboReactPackage)
// interface, which React Native itself marks deprecated in favor of codegen'd
// TurboReactPackage — harmless here since TorrentModule is intentionally the
// classic style (see TorrentModule.kt's doc comment); suppressed rather than
// chasing a framework-level deprecation this module deliberately opts out of.
@Suppress("DEPRECATION")
class TorrentPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(TorrentModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
