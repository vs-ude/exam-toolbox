FROM alpine:latest

# Copy the cron schedule and set its permissions
COPY exam-cleanup-cron /etc/crontabs/exam-cleanup-cron
RUN chmod 0600 /etc/crontabs/exam-cleanup-cron

CMD ["crond", "-f"]
