declare namespace NodeJS {
  interface ProcessEnv {
    readonly NOTION_AUTH_TOKEN: string;
    readonly NOTION_DATABASE_ID: string;
  }
}
