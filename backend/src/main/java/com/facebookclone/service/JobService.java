package com.facebookclone.service;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.*;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.FbPageRepository;
import com.facebookclone.repository.JobApplicationRepository;
import com.facebookclone.repository.JobPostingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Jobs: post openings, browse and apply, and review applicants. */
@Service
@RequiredArgsConstructor
public class JobService {

    public static final List<String> TYPES = List.of("FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "VOLUNTEER");
    private static final Set<String> STATUSES = Set.of("SUBMITTED", "REVIEWED", "INTERVIEW", "REJECTED", "HIRED");

    private final JobPostingRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final FbPageRepository pageRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<JobDto> browse(String query, String type, String location, Boolean remote, Long viewerId) {
        Stream<JobPosting> stream = jobRepository.findOpen().stream();
        if (query != null && !query.isBlank()) {
            String q = query.trim().toLowerCase();
            stream = stream.filter(j -> j.getTitle().toLowerCase().contains(q)
                    || j.getCompany().toLowerCase().contains(q)
                    || (j.getDescription() != null && j.getDescription().toLowerCase().contains(q)));
        }
        if (type != null && !type.isBlank()) stream = stream.filter(j -> j.getEmploymentType().equalsIgnoreCase(type));
        if (location != null && !location.isBlank()) {
            String place = location.trim().toLowerCase();
            stream = stream.filter(j -> j.getLocation() != null && j.getLocation().toLowerCase().contains(place));
        }
        if (Boolean.TRUE.equals(remote)) stream = stream.filter(JobPosting::isRemote);
        return decorate(stream.toList(), viewerId);
    }

    @Transactional(readOnly = true)
    public List<JobDto> posted(Long viewerId) {
        return decorate(jobRepository.findByPoster(viewerId), viewerId);
    }

    @Transactional(readOnly = true)
    public List<ApplicationDto> myApplications(Long viewerId) {
        return applicationRepository.findForApplicant(viewerId).stream()
                .map(a -> toDto(a, decorate(List.of(a.getJob()), viewerId).get(0)))
                .toList();
    }

    @Transactional(readOnly = true)
    public JobDto one(Long jobId, Long viewerId) {
        return decorate(List.of(require(jobId)), viewerId).get(0);
    }

    @Transactional
    public JobDto create(Long userId, JobRequest req) {
        JobPosting job = JobPosting.builder().poster(userService.require(userId)).build();
        apply(job, req, userId);
        return one(jobRepository.save(job).getId(), userId);
    }

    @Transactional
    public JobDto update(Long jobId, Long userId, JobRequest req) {
        JobPosting job = requireOwn(jobId, userId);
        apply(job, req, userId);
        if (req.open() != null) job.setOpen(req.open());
        jobRepository.save(job);
        return one(jobId, userId);
    }

    @Transactional
    public void delete(Long jobId, Long userId) {
        JobPosting job = requireOwn(jobId, userId);
        applicationRepository.deleteByJobId(jobId);
        jobRepository.delete(job);
    }

    @Transactional
    public JobDto applyTo(Long jobId, Long userId, ApplyRequest req) {
        JobPosting job = require(jobId);
        if (!job.isOpen()) throw ApiException.badRequest("This job is no longer taking applications");
        if (job.getPoster().getId().equals(userId)) throw ApiException.badRequest("You cannot apply to your own job");
        if (applicationRepository.findByJobIdAndApplicantId(jobId, userId).isPresent()) {
            throw ApiException.conflict("You already applied to this job");
        }
        User applicant = userService.require(userId);
        applicationRepository.save(JobApplication.builder()
                .job(job)
                .applicant(applicant)
                .message(blankToNull(req.message()))
                .email(req.email() == null || req.email().isBlank() ? applicant.getEmail() : req.email().trim())
                .phone(blankToNull(req.phone()))
                .resumeUrl(blankToNull(req.resumeUrl()))
                .build());

        notificationService.raise(job.getPoster(), applicant, Notification.Type.JOB_APPLICATION,
                applicant.getFullName() + " applied for " + job.getTitle() + ".",
                "/jobs/" + jobId, null);
        return one(jobId, userId);
    }

    @Transactional(readOnly = true)
    public List<ApplicationDto> applicants(Long jobId, Long userId) {
        JobPosting job = requireOwn(jobId, userId);
        JobDto dto = decorate(List.of(job), userId).get(0);
        return applicationRepository.findForJob(jobId).stream().map(a -> toDto(a, dto)).toList();
    }

    @Transactional
    public ApplicationDto setStatus(Long applicationId, Long userId, String statusRaw) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Application"));
        JobPosting job = application.getJob();
        if (!job.getPoster().getId().equals(userId)) throw ApiException.forbidden("Only the poster can do that");

        String status = statusRaw == null ? "" : statusRaw.trim().toUpperCase();
        if (!STATUSES.contains(status)) throw ApiException.badRequest("Unknown status");
        application.setStatus(status);
        applicationRepository.save(application);

        notificationService.raise(application.getApplicant(), job.getPoster(), Notification.Type.JOB_APPLICATION_UPDATE,
                "Your application for " + job.getTitle() + " is now " + status.toLowerCase() + ".",
                "/jobs/" + job.getId(), null);
        return toDto(application, decorate(List.of(job), userId).get(0));
    }

    private void apply(JobPosting job, JobRequest req, Long userId) {
        String type = req.employmentType().trim().toUpperCase();
        if (!TYPES.contains(type)) throw ApiException.badRequest("Unknown employment type");
        if (req.salaryMin() != null && req.salaryMax() != null && req.salaryMin().compareTo(req.salaryMax()) > 0) {
            throw ApiException.badRequest("The minimum salary is above the maximum");
        }
        FbPage page = null;
        if (req.pageId() != null) {
            page = pageRepository.findById(req.pageId()).orElseThrow(() -> ApiException.notFound("Page"));
            if (!page.getOwner().getId().equals(userId)) throw ApiException.forbidden("You can only post as your own Page");
        }
        job.setTitle(req.title().trim());
        job.setCompany(req.company().trim());
        job.setLocation(blankToNull(req.location()));
        job.setEmploymentType(type);
        job.setRemote(req.remote());
        job.setSalaryMin(req.salaryMin());
        job.setSalaryMax(req.salaryMax());
        job.setDescription(blankToNull(req.description()));
        job.setPage(page);
    }

    private JobPosting require(Long jobId) {
        return jobRepository.findById(jobId).orElseThrow(() -> ApiException.notFound("Job"));
    }

    private JobPosting requireOwn(Long jobId, Long userId) {
        JobPosting job = require(jobId);
        if (!job.getPoster().getId().equals(userId)) throw ApiException.forbidden("Only the poster can do that");
        return job;
    }

    private List<JobDto> decorate(List<JobPosting> jobs, Long viewerId) {
        if (jobs.isEmpty()) return List.of();
        List<Long> ids = jobs.stream().map(JobPosting::getId).toList();
        Map<Long, Long> counts = applicationRepository.countByJobIds(ids).stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));
        Map<Long, String> mine = applicationRepository.findMyStatuses(viewerId, ids).stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (String) r[1]));

        return jobs.stream().map(j -> {
            boolean own = j.getPoster().getId().equals(viewerId);
            return new JobDto(
                    j.getId(),
                    UserDto.summary(j.getPoster()),
                    PostService.pageRef(j.getPage()),
                    j.getTitle(),
                    j.getCompany(),
                    j.getLocation(),
                    j.getEmploymentType(),
                    j.isRemote(),
                    j.getSalaryMin(),
                    j.getSalaryMax(),
                    j.getCurrency(),
                    j.getDescription(),
                    j.isOpen(),
                    own,
                    own ? counts.getOrDefault(j.getId(), 0L) : 0,
                    mine.get(j.getId()),
                    j.getCreatedAt());
        }).toList();
    }

    private static ApplicationDto toDto(JobApplication a, JobDto job) {
        return new ApplicationDto(a.getId(), job, UserDto.summary(a.getApplicant()), a.getMessage(), a.getEmail(),
                a.getPhone(), a.getResumeUrl(), a.getStatus(), a.getCreatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
