package controller

import "time"

var gameDBRetryDelays = []time.Duration{
	50 * time.Millisecond,
	100 * time.Millisecond,
	200 * time.Millisecond,
}

// withGameDBRetry retries a KeyDB write with short backoff.
func withGameDBRetry(op func() error) error {
	err := op()
	for _, d := range gameDBRetryDelays {
		if err == nil {
			return nil
		}
		time.Sleep(d)
		err = op()
	}
	return err
}
