import { useState, useEffect, useCallback } from 'react';
import { getTauriAppInfo, getTauriConfigSync, type TauriAppInfo } from '../services/tauriService';

export function useTauriApp() {
  const [appInfo, setAppInfo] = useState<TauriAppInfo>(() => getTauriConfigSync());
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const info = await getTauriAppInfo();
      setAppInfo(info);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getTauriAppInfo().then((info) => {
      if (mounted) {
        setAppInfo(info);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    appInfo,
    version: appInfo.version,
    productName: appInfo.productName,
    isTauri: appInfo.isTauri,
    hasConfigFile: appInfo.hasConfigFile,
    source: appInfo.source,
    loading,
    refresh,
  };
}
