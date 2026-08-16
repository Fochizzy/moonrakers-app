import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

export default {
  ...config,
  middleware: {
    external: false,
  },
  cloudflare: {
    ...config.cloudflare,
    dangerousDisableConfigValidation: true,
  },
};
