import { Player } from "../type/types";

export const isDrawing = (player: Player, drawer?: Player): boolean => {
    if (!drawer || !player)
      return false;
    return player.id === drawer.id;
};
