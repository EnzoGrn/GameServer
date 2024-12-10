/*
 * @brief Enum for the type of message.
 * @note You can used it for differenciate the message and had a custom display for each type of message.
 */
export enum MessageType {
    MESSAGE, // Normal message.
    SYSTEM,  // System message.
    SECRET   // Secret message (private, only shown to all the users that found the word for example).
}

/*
 * @brief Interface for the message.
 * @note If the message doesn't have a sender_id, it's a system message.
 */
export interface Message {
    sender_id   ?: string;      // The sender id, not given for system message.
    sender_name ?: string;    // The sender name, not given for system message.
    type         : MessageType; // The type of the message. (see MessageType enum)
    content      : string;      // Content of the message. (string)
    color       ?: string;      // The color of the message. (Given by the system)
    timestamp    : number;      // The timestamp of the message.
}
