import { AgentifyInstance } from "./agentify";

export type ProviderOptions = any;

export interface Provider {
  name: string;
  description: string;
  options: ProviderOptions;
}

declare module "./agentify" {
  interface AgentifyInstance {
    _providers: Map<Provider["name"], Provider>;
    providers: {
      create: (provider: Provider, options: ProviderOptions) => void;
    };
  }
}

export default function buildProviderSystem(agentify: AgentifyInstance) {
  const providers = new Map<string, Provider>();

  agentify.decorate("_providers", providers);

  const create = function (provider: Provider, options: ProviderOptions) {
    if (providers.has(provider.name)) {
      throw new Error(`Provider ${provider.name} already exists`);
    }

    const obj: Provider = { ...provider, options };

    providers.set(provider.name, obj);
  };

  const list = function () {
    return Array.from(providers.values());
  };

  const get = function (name: string) {
    return providers.get(name);
  };

  const print = function () {
    if (providers.size === 0) {
      console.log("No providers registered");
    } else {
      console.log("Providers:");
      for (const provider of providers.values()) {
        console.log(`- ${provider.name}`);
      }
    }
  };

  agentify.decorate("providers", {
    create,
    list,
    get,
    print,
  });

  return agentify;
}
