const ctx: Worker = self as any;

ctx.addEventListener('message', event => {
  const { data: services } = event;

  const importedServices = {};
  services?.map((service: string) => {
    const importService = async () => {
      await import(service).then(() => {
        importedServices[service] = true;
      });
    };

    importService();
  });

  ctx.postMessage(importedServices);
});

export {};
