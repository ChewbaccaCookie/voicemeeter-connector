export const InterfaceTypes = {
    strip: 0,
    bus: 1,
};

export enum StripProperties {
    Mono = "Mono",
    Mute = "Mute",
    Solo = "Solo",
    MC = "MC",
    Gain = "Gain",
    Pan_x = "Pan_x",
    Pan_y = "Pan_y",
    Color_x = "Color_x",
    Color_y = "Color_y",
    fx_x = "fx_x",
    fx_y = "fx_y",
    Audibility = "Audibility",
    Comp = "Comp",
    Gate = "Gate",
    EqGain1 = "EqGain1",
    EqGain2 = "EqGain2",
    EqGain3 = "EqGain3",
    Label = "Label",
    A1 = "A1",
    A2 = "A2",
    A3 = "A3",
    A4 = "A4",
    A5 = "A5",
    B1 = "B1",
    B2 = "B2",
    B3 = "B3",
    FadeTo = "FadeTo",
}
export enum BusProperties {
    Mono = "Mono",
    Mute = "Mute",
    EQ = "EQ.on",
    Gain = "Gain",
    NormalMode = "mode.normal",
    AmixMode = "mode.Amix",
    BmixMode = "mode.Bmix",
    RepeatMode = "mode.Repeat",
    CompositeMode = "mode.Composite",
    FadeTo = "FadeTo",
    Label = "Label",
}

export enum MacroButtonModes {
    DEFAULT = 0x00_00_00_00,
    STATEONLY = 0x00_00_00_02,
    TRIGGER = 0x00_00_00_03,
    COLOR = 0x00_00_00_04,
}
