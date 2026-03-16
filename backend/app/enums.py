from enum import Enum


class FinishEnum(str, Enum):
    flamed = "flamed"
    brushed = "brushed"
    polished = "polished"
    honed = "honed"
    leathered = "leathered"
    sandblasted = "sandblasted"


class StatusEnum(str, Enum):
    available = "available"
    reserved = "reserved"
    used = "used"

class MaterialEnum(str, Enum):
    granite = "granite"
    marble = "marble"
    quartz = "quartz"
    travertine = "travertine"
    onyx = "onyx"
    misc = "misc"