import time
import threading
import logging
import pyperclip


class CopyTracker:
    def __init__(self, poll_interval=1.0, callback=None):
        self.poll_interval = poll_interval
        self.callback = callback
        self.event_log = []
        self.last_clipboard = ""
        self.running = False
        self.risk_score = 0  # cumulative risk score for copy events
        # For exponential risk in a one-minute window.
        self.last_event_time = None
        self.event_count = 0  # number of events within the last minute

        self.logger = logging.getLogger("CopyTracker")
        self.logger.setLevel(logging.DEBUG)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(name)s: %(message)s")
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def poll_clipboard(self):
        while self.running:
            try:
                text = pyperclip.paste()
            except Exception as e:
                self.logger.error("Error reading clipboard: %s", e)
                text = ""
            # Check if clipboard content has changed and is not empty.
            if text != self.last_clipboard and text.strip() != "":
                current_time = time.time()
                word_count = len(text.split())
                # Base risk: +10 points per 10 words.
                base_risk = (word_count // 10) * 10
                # Check if the event is within 60 seconds of the previous event.
                if self.last_event_time and (current_time - self.last_event_time) < 60:
                    self.event_count += 1
                else:
                    self.event_count = 1
                self.last_event_time = current_time

                # Exponential multiplier: for instance, risk multiplied by 2^(n-1)
                multiplier = 2 ** (self.event_count - 1)
                risk_increment = base_risk * multiplier

                self.risk_score += risk_increment

                event = {
                    "timestamp": current_time,
                    "event": "Copy-Paste Detected",
                    "content_preview": text[:50],
                    "word_count": word_count,
                    "risk": risk_increment,
                    "multiplier": multiplier,
                    "event_count": self.event_count
                }
                self.event_log.append(event)
                self.logger.info("Copy detected. Words: %d, Base risk: %d, Multiplier: %d, Total risk increment: %d",
                                 word_count, base_risk, multiplier, risk_increment)
                if self.callback:
                    self.callback(event)
                self.last_clipboard = text
            time.sleep(self.poll_interval)

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self.poll_clipboard, daemon=True)
        self.thread.start()
        self.logger.info("CopyTracker started.")

    def stop(self):
        self.running = False
        self.thread.join()
        self.logger.info("CopyTracker stopped.")


if __name__ == "__main__":
    def event_callback(event):
        print("Copy Event:", event)


    tracker = CopyTracker(callback=event_callback)
    tracker.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        tracker.stop()
