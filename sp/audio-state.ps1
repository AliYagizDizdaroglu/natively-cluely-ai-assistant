# Throwaway, READ-ONLY: the default playback device's master volume and mute state (Core Audio,
# eRender / eMultimedia), because a flight plays its stimulus aloud and the app listens to it.
# Only the getters are declared as callable members; nothing here sets a value.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i(); int j(); int k();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int l(); int m(); int n(); int o(); int p();
  int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int f();
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class AudioRead {
  static IAudioEndpointVolume Vol() {
    var e = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null;
    Marshal.ThrowExceptionForHR(e.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume v = null;
    var id = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref id, 23, 0, out v));
    return v;
  }
  public static float Volume() { float x; Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out x)); return x; }
  public static bool Muted() { bool b; Marshal.ThrowExceptionForHR(Vol().GetMute(out b)); return b; }
}
'@
"default playback device: volume={0:P0} muted={1}" -f [AudioRead]::Volume(), [AudioRead]::Muted()
