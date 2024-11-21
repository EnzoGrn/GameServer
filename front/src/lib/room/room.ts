import { Player, Room } from "../type/types";

/*
 * @brief Get the player by his id.
 */
export const GetPlayerById = (room: Room, user_id: string): Player => {
    const player = room.players.find((player: Player) => player.id === user_id);

    if (!player)
        throw new Error(`Player with id ${user_id} not found in room ${room.id}...`);
    return player;
}
