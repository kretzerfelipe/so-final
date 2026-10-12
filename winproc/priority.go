package winproc

import "fmt"

func PriorityName(delta int32) string {
	switch delta {
	case -15:
		return "IDLE"
	case -2:
		return "LOWEST"
	case -1:
		return "BELOW_NORMAL"
	case 0:
		return "NORMAL"
	case 1:
		return "ABOVE_NORMAL"
	case 2:
		return "HIGHEST"
	case 15:
		return "TIME_CRITICAL"
	}
	return fmt.Sprintf("DELTA(%d)", delta)
}
