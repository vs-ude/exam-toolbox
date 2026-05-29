FROM alpine:latest
RUN apk add --no-cache tini

# Copy the cron schedule and set its permissions
COPY exam-cleanup-cron /etc/crontabs/exam-cleanup-cron
RUN chmod 0600 /etc/crontabs/exam-cleanup-cron

ENTRYPOINT [ "/sbin/tini", "--" ]
CMD ["crond", "-f"]
