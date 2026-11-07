import { z } from "zod";
import { objectId } from "../../../shared/objectIdValidator";

const readNotificationSchema = z.object({
  params: z.object({
    id: objectId('Notification id')
  })
})

export const NotificationValidation = {
  readNotificationSchema
}