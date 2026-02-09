declare module "prisma/config" {
  type PrismaConfig = {
    schema?: string;
    migrations?: {
      path?: string;
    };
    datasource?: {
      url?: string;
    };
  };

  export const defineConfig: (config: PrismaConfig) => PrismaConfig;
}
