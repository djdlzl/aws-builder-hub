export const LOCUST_GATEWAY_URL_OPTIONS = [
  "https://api.vigloo.com",
  "https://api.stgvigloo.com",
  "https://api.devvigloo.com",
  "https://jp-gw.spooncast.net",
  "https://kr-gw.stgspoon.com",
  "https://jp-gw.stgspoon.com",
  "https://tw-gw.stgspoon.com",
  "https://kr-gw.spooncast.net",
  "https://tw-gw.spooncast.net",
  "https://kr-gw.devspoon.net",
] as const;

export const CUSTOM_LOCUST_GATEWAY_OPTION = "__custom_locust_gateway__";

export function isPresetLocustGatewayUrl(value: string): boolean {
  return LOCUST_GATEWAY_URL_OPTIONS.includes(value as (typeof LOCUST_GATEWAY_URL_OPTIONS)[number]);
}

export function getLocustGatewaySelectValue(value: string): string {
  return isPresetLocustGatewayUrl(value) ? value : CUSTOM_LOCUST_GATEWAY_OPTION;
}
