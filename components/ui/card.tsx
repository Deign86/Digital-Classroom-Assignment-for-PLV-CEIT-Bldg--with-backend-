import * as React from "react";

import { cn } from "./utils";

type SlotProps = React.ComponentProps<"div"> & { as?: React.ElementType };

function makeSlot<T extends React.ElementType = "div">(
  defaultTag: T,
  dataSlot: string,
  defaultClass: string,
) {
  type Props = {
    className?: string;
  } & Omit<React.ComponentProps<T>, "className">;

  const Component = React.forwardRef<HTMLElement, Props & { as?: React.ElementType }>(
    function Slot(props, ref) {
      const { className, as: As, ...rest } = props as Props & { as?: React.ElementType };
      const Tag: any = As || defaultTag;
      return (
        <Tag
          ref={ref as any}
          data-slot={dataSlot}
          className={cn(defaultClass, className)}
          {...(rest as any)}
        />
      );
    },
  );

  Component.displayName = `Card.${dataSlot}`;

  return Component as unknown as React.FC<Props & { as?: React.ElementType }>;
}

const Card = makeSlot(
  "div",
  "card",
  "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
);

const CardHeader = makeSlot(
  "div",
  "card-header",
  "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
);

const CardTitle = makeSlot("h4", "card-title", "leading-none");

const CardDescription = makeSlot(
  "div",
  "card-description",
  "text-muted-foreground",
);

const CardAction = makeSlot(
  "div",
  "card-action",
  "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
);

const CardContent = makeSlot(
  "div",
  "card-content",
  "px-6 [&:last-child]:pb-6",
);

const CardFooter = makeSlot(
  "div",
  "card-footer",
  "flex items-center px-6 pb-6 [.border-t]:pt-6",
);

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
