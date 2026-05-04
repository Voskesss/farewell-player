import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'

export default function RemoteQRCode({ onClose }) {
  const { t } = useTranslation()
  const [serverInfo, setServerInfo] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [selectedIP, setSelectedIP] = useState(null)

  useEffect(() => {
    if (window.electronAPI?.getRemoteServerInfo) {
      window.electronAPI.getRemoteServerInfo().then(info => {
        setServerInfo(info)
        if (info.ips && info.ips.length > 0) {
          setSelectedIP(info.ips[0])
        }
      })
    }
  }, [])

  useEffect(() => {
    if (selectedIP && serverInfo) {
      const url = `http://${selectedIP}:${serverInfo.port}`
      generateQRCode(url).then(setQrDataUrl)
    }
  }, [selectedIP, serverInfo])

  const generateQRCode = async (text) => {
    // Simple QR code generation using canvas
    // We'll use a basic QR library or generate server-side
    // For now, use a QR code API as fallback
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
  }

  if (!serverInfo) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-2xl p-6 text-center">
          <p className="text-white">Laden...</p>
        </div>
      </div>
    )
  }

  const remoteUrl = selectedIP ? `http://${selectedIP}:${serverInfo.port}` : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{t('remote.title')}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          {t('remote.instructions')}
        </p>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="bg-white p-4 rounded-xl mb-4 flex justify-center">
            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
          </div>
        )}

        {/* IP selection if multiple */}
        {serverInfo.ips && serverInfo.ips.length > 1 && (
          <div className="mb-4">
            <label className="text-slate-400 text-xs block mb-1">{t('remote.selectNetwork')}</label>
            <select
              value={selectedIP || ''}
              onChange={(e) => setSelectedIP(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              {serverInfo.ips.map(ip => (
                <option key={ip} value={ip}>{ip}</option>
              ))}
            </select>
          </div>
        )}

        {/* URL */}
        {remoteUrl && (
          <div className="bg-slate-700 rounded-lg p-3 mb-4">
            <p className="text-slate-400 text-xs mb-1">{t('remote.orOpenUrl')}</p>
            <p className="text-white font-mono text-sm break-all select-all">{remoteUrl}</p>
          </div>
        )}

        <p className="text-slate-500 text-xs text-center">
          {t('remote.sameWifi')}
        </p>
      </div>
    </div>
  )
}
