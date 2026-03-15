export type Phase1CapabilityStatus = 'available' | 'blocked';

export type Phase1CapabilityKey =
    | 'forms'
    | 'notifications'
    | 'memberships'
    | 'eventRegistrations'
    | 'messages'
    | 'paymentsUi'
    | 'reporting';

export interface Phase1Capability {
    key: Phase1CapabilityKey;
    label: string;
    status: Phase1CapabilityStatus;
    reason?: string;
    apiSurface?: string[];
}

export const PHASE1_CAPABILITIES: Record<Phase1CapabilityKey, Phase1Capability> = {
    forms: {
        key: 'forms',
        label: 'Formulare & Waiver',
        status: 'available',
        apiSurface: ['/forms', '/forms/{id}/submissions', '/form-submissions/{id}'],
    },
    notifications: {
        key: 'notifications',
        label: 'Benachrichtigungen',
        status: 'available',
        apiSurface: ['/notifications', '/notifications/{id}'],
    },
    memberships: {
        key: 'memberships',
        label: 'Mitgliedschaften',
        status: 'blocked',
        reason: 'Mitgliedschafts-CRUD-Endpunkte sind serverseitig noch nicht verfügbar.',
    },
    eventRegistrations: {
        key: 'eventRegistrations',
        label: 'Event-Registrierungen',
        status: 'blocked',
        reason: 'Registrierungs-Endpunkte (anmelden/stornieren/Teilnehmerliste) fehlen noch im API-Server.',
    },
    messages: {
        key: 'messages',
        label: 'Nachrichten',
        status: 'available',
        apiSurface: ['/messages', '/messages/conversations'],
    },
    paymentsUi: {
        key: 'paymentsUi',
        label: 'Zahlungen',
        status: 'blocked',
        reason: 'Nur Webhook-Ingest ist verfügbar; kein browserfähiger Checkout-Flow vorhanden.',
        apiSurface: ['/payments/webhooks/{provider} (server-only)'],
    },
    reporting: {
        key: 'reporting',
        label: 'Berichte',
        status: 'blocked',
        reason: 'Berichts-Endpunkte für Mitgliedschaft/Event/Umsatz sind noch nicht verfügbar.',
    },
};

export function isCapabilityAvailable(key: Phase1CapabilityKey): boolean {
    return PHASE1_CAPABILITIES[key].status === 'available';
}
