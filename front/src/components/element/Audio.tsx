import { useAudio } from '@/lib/audio/audioProvider';
import React from 'react';
import { IoMdVolumeHigh } from "react-icons/io";
import { IoMdVolumeMute } from "react-icons/io";
import { IoMdVolumeLow } from "react-icons/io";

interface AudioProps {
    iconSize? : number;
    min?: number;
    max?: number;
    step?: number;
}

const Audio: React.FC<AudioProps> = (props: AudioProps) => {
    const {volume, setVolume} = useAudio();

    return (
        <div className="flex flex-row gap-2">
            {volume >= (props.max ?? 1) / 2 && <IoMdVolumeHigh size={props.iconSize ?? 30} className="cursor-pointer self-center" />}
            {volume === 0 && <IoMdVolumeMute size={props.iconSize ?? 30} className="cursor-pointer self-center" />}
            {volume < (props.max ?? 1) / 2 && volume !== 0 && <IoMdVolumeLow size={props.iconSize ?? 30} className="cursor-pointer self-center" />}
            <input className='accent-black' type="range" min={props.min ?? 0} max={props.max ?? 1} step={props.step ?? 0.01} value={volume ?? 0.5} onChange={(e) => { setVolume(parseFloat(e.target.value)); }} />
        </div>
    );
};

export default Audio;
