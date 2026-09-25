package com.shikara

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.shikara.torrent.TorrentPackage
import com.shikara.player.PlayerPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // docs/03-Phase3-Torrent-Streaming.md §5 — native torrent module,
          // not autolinked since it isn't a standalone npm package.
          add(TorrentPackage())
          // docs/03-Phase3-Torrent-Streaming.md §5.3 — native player module + view.
          add(PlayerPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
