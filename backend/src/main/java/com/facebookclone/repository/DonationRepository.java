package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    @Query("SELECT d FROM Donation d JOIN FETCH d.donor WHERE d.fundraiser.id = :id ORDER BY d.createdAt DESC")
    List<Donation> findForFundraiser(@Param("id") Long fundraiserId);

    /** fundraiser id, total raised, number of donations */
    @Query("""
           SELECT d.fundraiser.id, SUM(d.amount), COUNT(d) FROM Donation d
           WHERE d.fundraiser.id IN :ids GROUP BY d.fundraiser.id
           """)
    List<Object[]> totals(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM Donation d WHERE d.fundraiser.id = :id")
    void deleteByFundraiserId(@Param("id") Long fundraiserId);
}
