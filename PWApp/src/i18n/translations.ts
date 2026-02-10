import type { Language } from '../types';

export const translations = {
  en: {
    welcome: {
      title: "Set up your Weather Potato!",
      subtitle: "In 3 clicks, your potato becomes a meteorologist",
      cta: "Let's go!",
      scanQR: "Scan the QR code on your Weather Potato to start"
    },
    ble: {
      connecting: "Looking for your Potato...",
      connected: "Potato detected!",
      verifying: "Verifying device...",
      failed: "Cannot connect via Bluetooth",
      notSupported: "Bluetooth not available",
      notSupportedDesc: "Your browser doesn't support Bluetooth. No worries, we have a plan B!",
      wrongDevice: "Wrong potato!",
      wrongDeviceDesc: "This isn't the right Potato. Scan the QR code of the device you want to configure."
    },
    wifi: {
      scanTitle: "Scan your WiFi QR code",
      scanSubtitle: "The fastest way! Look for the QR code on your internet box.",
      detected: "WiFi detected",
      manual: "Enter manually",
      help: "Where to find the QR code?",
      helpItems: [
        "Freebox, Orange, SFR: Under or behind the box",
        "Look for a sticker with a QR code",
        "No QR? Note the name (SSID) and password written next to it"
      ],
      ssidLabel: "WiFi Network Name (SSID)",
      passwordLabel: "WiFi Password",
      ssidPlaceholder: "e.g., Livebox-A1B2",
      passwordPlaceholder: "••••••••",
      continue: "Continue",
      backToScan: "Back to QR scan",
      manualTitle: "Manual entry",
      manualSubtitle: "Old school style!",
      noQR: "No QR code? No worries! You can enter manually."
    },
    location: {
      detecting: "Detecting your location...",
      detected: "Location",
      denied: "Location denied",
      deniedDesc: "No problem, you can enter your city manually!",
      manual: "Enter location manually",
      cityPlaceholder: "Enter your city"
    },
    validation: {
      sending: "Sending info to your Potato...",
      sent: "Info sent!",
      connecting: "Potato connecting to WiFi...",
      validating: "Checking local connection...",
      validated: "Local connection validated!",
      failed: "Unable to communicate with Potato",
      failedDesc: "Make sure your phone is on the same WiFi.",
      troubleshooting: [
        "Check that your phone is connected to WiFi (not 4G)",
        "Make sure you're on the main network (not \"Guest WiFi\")",
        "Get closer to your internet box",
        "Restart the Potato if needed"
      ],
      retry: "Retry",
      help: "Help"
    },
    success: {
      title: "Tadaaaa!",
      subtitle: "Your Weather Potato is ready to meteorize!",
      test: "Test now",
      dashboard: "View dashboard",
      tip: "Tip",
      tipText: "Press your Potato to discover real-time weather!"
    },
    errors: {
      timeout: "Time's up!",
      timeoutDesc: "No panic, you can enter manually. It's like the good old days!",
      wifiFailed: "Potato can't connect",
      wifiFailedDesc: "The password might be incorrect or the network not found.",
      deviceMismatch: "Wrong potato!",
      retry: "Retry",
      rescanQR: "Re-scan QR",
      editManually: "Edit manually"
    },
    common: {
      loading: "Loading...",
      continue: "Continue",
      cancel: "Cancel",
      close: "Close",
      back: "Back"
    }
  },
  fr: {
    welcome: {
      title: "Configurez votre Weather Potato !",
      subtitle: "En 3 clics, votre patate devient météorologue",
      cta: "C'est parti !",
      scanQR: "Scannez le QR code sur votre Weather Potato pour commencer"
    },
    ble: {
      connecting: "Recherche de votre Potato...",
      connected: "Potato détectée !",
      verifying: "Vérification de l'appareil...",
      failed: "Impossible de se connecter en Bluetooth",
      notSupported: "Bluetooth non disponible",
      notSupportedDesc: "Votre navigateur ne supporte pas le Bluetooth. Pas de panique, on a un plan B !",
      wrongDevice: "Mauvaise patate !",
      wrongDeviceDesc: "Ce n'est pas la bonne Potato. Scannez le QR code de l'appareil que vous voulez configurer."
    },
    wifi: {
      scanTitle: "Scannez le QR WiFi",
      scanSubtitle: "C'est la manière la plus rapide ! Cherchez le QR code sur votre box.",
      detected: "WiFi détecté",
      manual: "Saisir manuellement",
      help: "Où trouver le QR code ?",
      helpItems: [
        "Freebox, Orange, SFR : Sous ou derrière la box",
        "Cherchez un autocollant avec QR code",
        "Pas de QR ? Notez le nom (SSID) et mot de passe écrits à côté"
      ],
      ssidLabel: "Nom du réseau WiFi (SSID)",
      passwordLabel: "Mot de passe WiFi",
      ssidPlaceholder: "Ex: Livebox-A1B2",
      passwordPlaceholder: "••••••••",
      continue: "Continuer",
      backToScan: "Retour au scan QR",
      manualTitle: "Saisie manuelle",
      manualSubtitle: "On fait à l'ancienne !",
      noQR: "Pas de QR code ? Pas de panique ! Vous pouvez saisir manuellement."
    },
    location: {
      detecting: "Détection de votre position...",
      detected: "Localisation",
      denied: "Localisation refusée",
      deniedDesc: "Pas grave, vous pouvez saisir votre ville manuellement !",
      manual: "Saisir la localisation manuellement",
      cityPlaceholder: "Entrez votre ville"
    },
    validation: {
      sending: "Envoi des infos à votre Potato...",
      sent: "Infos envoyées !",
      connecting: "La Potato se connecte au WiFi...",
      validating: "Vérification de la connexion locale...",
      validated: "Connexion locale validée !",
      failed: "Communication locale impossible",
      failedDesc: "Votre téléphone et la Potato ne se parlent pas. Vérifiez qu'ils sont sur le MÊME WiFi !",
      troubleshooting: [
        "Vérifiez que votre téléphone est connecté au WiFi (pas en 4G)",
        "Assurez-vous d'être sur le réseau principal (pas \"WiFi Invité\")",
        "Rapprochez-vous de votre box internet",
        "Redémarrez la Potato si besoin"
      ],
      retry: "Réessayer",
      help: "Aide"
    },
    success: {
      title: "Tadaaaa !",
      subtitle: "Votre Weather Potato est prête à météoriser !",
      test: "Tester maintenant",
      dashboard: "Voir le tableau de bord",
      tip: "Astuce",
      tipText: "Appuyez sur votre Potato pour découvrir la météo en temps réel !"
    },
    errors: {
      timeout: "Temps écoulé !",
      timeoutDesc: "Pas de panique, vous pouvez saisir manuellement. C'est comme au bon vieux temps !",
      wifiFailed: "La Potato n'arrive pas à se connecter",
      wifiFailedDesc: "Le mot de passe est peut-être incorrect ou le réseau introuvable.",
      deviceMismatch: "Mauvaise patate !",
      retry: "Réessayer",
      rescanQR: "Re-scanner le QR",
      editManually: "Corriger manuellement"
    },
    common: {
      loading: "Chargement...",
      continue: "Continuer",
      cancel: "Annuler",
      close: "Fermer",
      back: "Retour"
    }
  },
  es: {
    welcome: {
      title: "¡Configura tu Weather Potato!",
      subtitle: "En 3 clics, tu patata se convierte en meteoróloga",
      cta: "¡Vamos!",
      scanQR: "Escanea el código QR en tu Weather Potato para empezar"
    },
    ble: {
      connecting: "Buscando tu Potato...",
      connected: "¡Potato detectada!",
      verifying: "Verificando dispositivo...",
      failed: "No se puede conectar por Bluetooth",
      notSupported: "Bluetooth no disponible",
      notSupportedDesc: "Tu navegador no soporta Bluetooth. ¡No te preocupes, tenemos un plan B!",
      wrongDevice: "¡Patata equivocada!",
      wrongDeviceDesc: "Esta no es la Potato correcta. Escanea el código QR del dispositivo que quieres configurar."
    },
    wifi: {
      scanTitle: "Escanea tu código QR WiFi",
      scanSubtitle: "¡Es la forma más rápida! Busca el código QR en tu router.",
      detected: "WiFi detectado",
      manual: "Introducir manualmente",
      help: "¿Dónde encontrar el código QR?",
      helpItems: [
        "Router: Debajo o detrás del dispositivo",
        "Busca una etiqueta con código QR",
        "¿Sin QR? Anota el nombre (SSID) y contraseña escritos al lado"
      ],
      ssidLabel: "Nombre de red WiFi (SSID)",
      passwordLabel: "Contraseña WiFi",
      ssidPlaceholder: "ej: MiWiFi-A1B2",
      passwordPlaceholder: "••••••••",
      continue: "Continuar",
      backToScan: "Volver al escaneo QR",
      manualTitle: "Entrada manual",
      manualSubtitle: "¡A la vieja escuela!",
      noQR: "¿Sin código QR? ¡No hay problema! Puedes introducirlo manualmente."
    },
    location: {
      detecting: "Detectando tu ubicación...",
      detected: "Ubicación",
      denied: "Ubicación denegada",
      deniedDesc: "No hay problema, ¡puedes introducir tu ciudad manualmente!",
      manual: "Introducir ubicación manualmente",
      cityPlaceholder: "Introduce tu ciudad"
    },
    validation: {
      sending: "Enviando info a tu Potato...",
      sent: "¡Info enviada!",
      connecting: "Potato conectando a WiFi...",
      validating: "Verificando conexión local...",
      validated: "¡Conexión local validada!",
      failed: "No se puede comunicar con Potato",
      failedDesc: "Asegúrate de que tu teléfono está en la misma WiFi.",
      troubleshooting: [
        "Verifica que tu teléfono está conectado a WiFi (no 4G)",
        "Asegúrate de estar en la red principal (no \"WiFi Invitados\")",
        "Acércate a tu router",
        "Reinicia la Potato si es necesario"
      ],
      retry: "Reintentar",
      help: "Ayuda"
    },
    success: {
      title: "¡Tadaaaa!",
      subtitle: "¡Tu Weather Potato está lista para meteorizar!",
      test: "Probar ahora",
      dashboard: "Ver panel",
      tip: "Consejo",
      tipText: "¡Presiona tu Potato para descubrir el clima en tiempo real!"
    },
    errors: {
      timeout: "¡Tiempo agotado!",
      timeoutDesc: "Sin pánico, puedes introducirlo manualmente. ¡Como en los viejos tiempos!",
      wifiFailed: "Potato no puede conectarse",
      wifiFailedDesc: "La contraseña puede ser incorrecta o la red no encontrada.",
      deviceMismatch: "¡Patata equivocada!",
      retry: "Reintentar",
      rescanQR: "Re-escanear QR",
      editManually: "Editar manualmente"
    },
    common: {
      loading: "Cargando...",
      continue: "Continuar",
      cancel: "Cancelar",
      close: "Cerrar",
      back: "Atrás"
    }
  },
  de: {
    welcome: {
      title: "Richten Sie Ihre Weather Potato ein!",
      subtitle: "In 3 Klicks wird Ihre Kartoffel zum Meteorologen",
      cta: "Los geht's!",
      scanQR: "Scannen Sie den QR-Code auf Ihrer Weather Potato zum Starten"
    },
    ble: {
      connecting: "Suche nach Ihrer Potato...",
      connected: "Potato erkannt!",
      verifying: "Gerät wird überprüft...",
      failed: "Bluetooth-Verbindung fehlgeschlagen",
      notSupported: "Bluetooth nicht verfügbar",
      notSupportedDesc: "Ihr Browser unterstützt kein Bluetooth. Keine Sorge, wir haben einen Plan B!",
      wrongDevice: "Falsche Kartoffel!",
      wrongDeviceDesc: "Das ist nicht die richtige Potato. Scannen Sie den QR-Code des Geräts, das Sie konfigurieren möchten."
    },
    wifi: {
      scanTitle: "WiFi QR-Code scannen",
      scanSubtitle: "Der schnellste Weg! Suchen Sie den QR-Code auf Ihrem Router.",
      detected: "WiFi erkannt",
      manual: "Manuell eingeben",
      help: "Wo finde ich den QR-Code?",
      helpItems: [
        "Router: Unter oder hinter dem Gerät",
        "Suchen Sie nach einem Aufkleber mit QR-Code",
        "Kein QR? Notieren Sie Name (SSID) und Passwort daneben"
      ],
      ssidLabel: "WiFi-Netzwerkname (SSID)",
      passwordLabel: "WiFi-Passwort",
      ssidPlaceholder: "z.B.: MeinWiFi-A1B2",
      passwordPlaceholder: "••••••••",
      continue: "Weiter",
      backToScan: "Zurück zum QR-Scan",
      manualTitle: "Manuelle Eingabe",
      manualSubtitle: "Auf die alte Art!",
      noQR: "Kein QR-Code? Kein Problem! Sie können es manuell eingeben."
    },
    location: {
      detecting: "Standort wird erkannt...",
      detected: "Standort",
      denied: "Standort verweigert",
      deniedDesc: "Kein Problem, Sie können Ihre Stadt manuell eingeben!",
      manual: "Standort manuell eingeben",
      cityPlaceholder: "Geben Sie Ihre Stadt ein"
    },
    validation: {
      sending: "Info wird an Ihre Potato gesendet...",
      sent: "Info gesendet!",
      connecting: "Potato verbindet sich mit WiFi...",
      validating: "Lokale Verbindung wird überprüft...",
      validated: "Lokale Verbindung validiert!",
      failed: "Kommunikation mit Potato nicht möglich",
      failedDesc: "Stellen Sie sicher, dass Ihr Telefon im selben WiFi ist.",
      troubleshooting: [
        "Überprüfen Sie, dass Ihr Telefon mit WiFi verbunden ist (nicht 4G)",
        "Stellen Sie sicher, dass Sie im Hauptnetzwerk sind (nicht \"Gast-WiFi\")",
        "Gehen Sie näher an Ihren Router",
        "Starten Sie die Potato bei Bedarf neu"
      ],
      retry: "Wiederholen",
      help: "Hilfe"
    },
    success: {
      title: "Tadaaaa!",
      subtitle: "Ihre Weather Potato ist bereit zum Meteorisieren!",
      test: "Jetzt testen",
      dashboard: "Dashboard anzeigen",
      tip: "Tipp",
      tipText: "Drücken Sie Ihre Potato, um das Wetter in Echtzeit zu entdecken!"
    },
    errors: {
      timeout: "Zeit abgelaufen!",
      timeoutDesc: "Keine Panik, Sie können es manuell eingeben. Wie in alten Zeiten!",
      wifiFailed: "Potato kann sich nicht verbinden",
      wifiFailedDesc: "Das Passwort könnte falsch sein oder das Netzwerk nicht gefunden.",
      deviceMismatch: "Falsche Kartoffel!",
      retry: "Wiederholen",
      rescanQR: "QR erneut scannen",
      editManually: "Manuell bearbeiten"
    },
    common: {
      loading: "Lädt...",
      continue: "Weiter",
      cancel: "Abbrechen",
      close: "Schließen",
      back: "Zurück"
    }
  }
};

export type TranslationKey = typeof translations.en;
