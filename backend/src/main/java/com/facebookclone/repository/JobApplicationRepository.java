package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    Optional<JobApplication> findByJobIdAndApplicantId(Long jobId, Long applicantId);

    @Query("SELECT a FROM JobApplication a JOIN FETCH a.applicant WHERE a.job.id = :jobId ORDER BY a.createdAt DESC")
    List<JobApplication> findForJob(@Param("jobId") Long jobId);

    @Query("SELECT a FROM JobApplication a JOIN FETCH a.job j JOIN FETCH j.poster WHERE a.applicant.id = :userId ORDER BY a.createdAt DESC")
    List<JobApplication> findForApplicant(@Param("userId") Long userId);

    @Query("SELECT a.job.id, COUNT(a) FROM JobApplication a WHERE a.job.id IN :ids GROUP BY a.job.id")
    List<Object[]> countByJobIds(@Param("ids") Collection<Long> ids);

    @Query("SELECT a.job.id, a.status FROM JobApplication a WHERE a.applicant.id = :userId AND a.job.id IN :ids")
    List<Object[]> findMyStatuses(@Param("userId") Long userId, @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM JobApplication a WHERE a.job.id = :jobId")
    void deleteByJobId(@Param("jobId") Long jobId);
}
