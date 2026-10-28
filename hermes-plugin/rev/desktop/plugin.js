import { host } from "@hermes/plugin-sdk";
import { jsx, jsxs } from "react/jsx-runtime";

function RevPane() {
  const gateway = host.state?.gateway;
  return jsxs("div", {
    className: "flex h-full flex-col gap-2 p-3 font-mono text-xs",
    children: [
      jsx("div", { className: "font-semibold", children: "Rev Registry" }),
      jsx("div", { children: "GraphQL: http://localhost:8787/graphql" }),
      jsx("div", { children: "Open the Rev console for registry, lanes, receipts. Demo data is always labeled." }),
    ],
  });
}

export default {
  id: "rev",
  name: "Rev",
  register(ctx) {
    ctx.register({
      id: "rev-pane",
      area: "panes",
      title: "Rev",
      data: { placement: "right", width: "300px" },
      render: () => jsx(RevPane, {}),
    });
    ctx.register({
      id: "rev-status",
      area: "statusBar.right",
      order: 140,
      render: () =>
        jsx("button", {
          type: "button",
          className: "px-1.5 font-mono text-[0.6875rem]",
          onClick: () => host.notify?.({ kind: "info", message: "Rev: start server with npm start, then query /graphql." }),
          children: "REV",
        }),
    });
  },
};
