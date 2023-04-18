async function loadConfig(file: string): Promise<Record<string, unknown>> {
  const configFileContent = await Deno.readTextFile(file);
  return JSON.parse(configFileContent);
}

const config = await loadConfig("config.json");
export default config;
