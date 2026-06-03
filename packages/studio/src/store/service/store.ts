import { create } from "zustand";
import { fetchJson } from "../../hooks/use-api";
import type { ModelInfo, ServiceInfo, ServiceStore } from "./types";

interface GroupPayload {
  readonly service: string;
  readonly label: string;
  readonly models: ReadonlyArray<ModelInfo>;
}

export const useServiceStore = create<ServiceStore>()((set, get) => ({
  services: [],
  servicesLoading: false,

  modelsByService: {},
  bankModelsLoading: false,
  customModelsLoading: false,
  liveModelsLoading: {},

  fetchServices: async () => {
    if (get().services.length > 0 || get().servicesLoading) return;
    set({ servicesLoading: true });
    try {
      const data = await fetchJson<{ services: ReadonlyArray<ServiceInfo> }>("/services");
      set({ services: data.services ?? [], servicesLoading: false });
    } catch {
      set({ servicesLoading: false });
    }
  },

  refreshServices: async () => {
    set({ services: [], servicesLoading: false });
    await get().fetchServices();
  },

  fetchBankModels: async () => {
    if (get().bankModelsLoading) return;
    set({ bankModelsLoading: true });
    try {
      const data = await fetchJson<{ groups: ReadonlyArray<GroupPayload> }>("/services/models");
      set((s) => {
        const next = { ...s.modelsByService };
        for (const group of data.groups ?? []) {
          next[group.service] = group.models;
        }
        return { modelsByService: next, bankModelsLoading: false };
      });
    } catch {
      set({ bankModelsLoading: false });
    }
  },

  fetchCustomModels: async () => {
    if (get().customModelsLoading) return;
    set({ customModelsLoading: true });
    try {
      const data = await fetchJson<{ groups: ReadonlyArray<GroupPayload> }>("/services/models/custom");
      set((s) => {
        const next = { ...s.modelsByService };
        for (const group of data.groups ?? []) {
          next[group.service] = group.models;
        }
        return { modelsByService: next, customModelsLoading: false };
      });
    } catch {
      set({ customModelsLoading: false });
    }
  },

  fetchLiveModels: async (service: string) => {
    if (get().liveModelsLoading[service]) return;
    set((s) => ({ liveModelsLoading: { ...s.liveModelsLoading, [service]: true } }));
    try {
      const data = await fetchJson<{ models: ReadonlyArray<ModelInfo> }>(
        `/services/${encodeURIComponent(service)}/models`,
      );
      set((s) => ({
        modelsByService: { ...s.modelsByService, [service]: data.models ?? [] },
        liveModelsLoading: { ...s.liveModelsLoading, [service]: false },
      }));
    } catch {
      set((s) => ({ liveModelsLoading: { ...s.liveModelsLoading, [service]: false } }));
    }
  },

  setLiveModels: (service, models) => {
    set((s) => ({ modelsByService: { ...s.modelsByService, [service]: models } }));
  },

  clearModels: (service) => {
    set((s) => {
      const next = { ...s.modelsByService };
      delete next[service];
      return { modelsByService: next };
    });
  },

  getModelPickerStatus: () => {
    const { services, servicesLoading, bankModelsLoading, customModelsLoading, modelsByService } = get();
    if (servicesLoading) return "loading";
    const connected = services.filter((s) => s.connected);
    if (connected.length === 0) return "no-models";
    if (bankModelsLoading) return "loading";
    if (connected.some((s) => (modelsByService[s.service]?.length ?? 0) > 0)) return "ready";

    const hasConnectedBank = connected.some((s) => !s.service.startsWith("custom"));
    const hasConnectedCustom = connected.some((s) => s.service.startsWith("custom"));
    if (!hasConnectedBank && hasConnectedCustom && customModelsLoading) return "loading";
    return "no-models";
  },

  getGroupedModels: () => {
    const { services, modelsByService } = get();
    const groups: Array<{ service: string; label: string; models: ReadonlyArray<ModelInfo> }> = [];
    for (const svc of services.filter((s) => s.connected)) {
      const models = modelsByService[svc.service] ?? [];
      if (models.length > 0) {
        groups.push({ service: svc.service, label: svc.label, models });
      }
    }
    return groups;
  },
}));
