// Delivery step rules (pure data), shared by the server (order-store) and the admin UI.
import type { DeliveryStage } from "./db/schema";
/** Allowed next steps. Delivery only moves forward; "returned" ends a failed delivery and restocks. */
export const nextStages: Record<DeliveryStage, DeliveryStage[]> = {
  processing: ["shipped", "delivered"], shipped: ["out_for_delivery", "delivered", "returned"],
  out_for_delivery: ["delivered", "returned"], delivered: [], returned: [],
};
